import { Injectable } from '@angular/core';
import { SqlStatement, ValidationResult } from '../models/restore.models';

/**
 * Service responsible for validating backup files and parsing SQL statements robustly
 */
@Injectable({
  providedIn: 'root'
})
export class RestoreValidator {

  /**
   * Validates the backup file format and content
   */
  validateBackupFile(content: string): ValidationResult {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Backup file is empty');
    }

    // Check for basic SQL structure
    if (!content.includes('INSERT') && !content.includes('CREATE') && !content.includes('UPDATE')) {
      errors.push('Backup file does not contain valid SQL statements');
    }

    // Check for potential encoding issues
    if (content.includes('\uFFFD')) {
      errors.push('Backup file contains encoding issues');
    }

    return {
      isValid: errors.length === 0,
      errors,
      metadata: {
        contentLength: content.length,
        lineCount: content.split('\n').length
      }
    };
  }

  /**
   * Parses SQL statements with robust handling of multi-line statements,
   * string literals, and special characters
   */
  parseSqlStatements(content: string): SqlStatement[] {
    const statements: SqlStatement[] = [];
    const lines = content.split('\n');
    let currentStatement = '';
    let currentLineNumber = 0;
    let statementStartLine = 0;
    let inMultiLineStatement = false;
    let inStringLiteral = false;
    let stringDelimiter = '';
    let inComment = false;
    let escapeNext = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      currentLineNumber = i + 1;

      // Skip empty lines
      if (!trimmedLine) {
        if (currentStatement.trim()) {
          currentStatement += '\n';
        }
        continue;
      }

      // Handle SQL comments
      if (trimmedLine.startsWith('--') && !inStringLiteral) {
        continue;
      }

      // Handle multi-line comments
      if (trimmedLine.includes('/*') && !inStringLiteral) {
        inComment = true;
      }
      if (inComment) {
        if (trimmedLine.includes('*/')) {
          inComment = false;
        }
        continue;
      }

      // Track statement start
      if (!inMultiLineStatement && currentStatement.trim() === '') {
        statementStartLine = currentLineNumber;
      }

      // Process character by character to handle string literals and escaping properly
      let processedLine = '';
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = j < line.length - 1 ? line[j + 1] : '';

        // Handle escape sequences
        if (escapeNext) {
          processedLine += char;
          escapeNext = false;
          continue;
        }

        if (char === '\\' && inStringLiteral) {
          processedLine += char;
          escapeNext = true;
          continue;
        }

        // Handle string literal detection
        if (!inStringLiteral && (char === "'" || char === '"')) {
          inStringLiteral = true;
          stringDelimiter = char;
          processedLine += char;
        } else if (inStringLiteral && char === stringDelimiter) {
          // Check for doubled quotes (SQL escape mechanism)
          if (nextChar === stringDelimiter) {
            // This is an escaped quote, include both characters
            processedLine += char + nextChar;
            j++; // Skip the next character as we've processed it
          } else {
            // End of string literal
            inStringLiteral = false;
            stringDelimiter = '';
            processedLine += char;
          }
        } else {
          processedLine += char;
        }
      }

      currentStatement += processedLine + '\n';

      // Detect end of statement (semicolon outside of string literals)
      if (!inStringLiteral && this.endsWithSemicolonOutsideString(processedLine)) {
        const statement = this.createSqlStatement(
          currentStatement.trim(),
          statementStartLine,
          inMultiLineStatement
        );

        if (statement) {
          statements.push(statement);
        }

        // Reset for next statement
        currentStatement = '';
        inMultiLineStatement = false;
      } else if (currentStatement.trim()) {
        inMultiLineStatement = true;
      }
    }

    // Handle case where last statement doesn't end with semicolon
    if (currentStatement.trim()) {
      const statement = this.createSqlStatement(
        currentStatement.trim(),
        statementStartLine,
        inMultiLineStatement
      );
      if (statement) {
        statements.push(statement);
      }
    }

    return statements;
  }

  /**
   * Validates individual SQL statement
   */
  validateSqlStatement(statement: SqlStatement): boolean {
    if (!statement.content || statement.content.trim().length === 0) {
      return false;
    }

    // Basic SQL syntax validation
    const content = statement.content.trim().toUpperCase();
    
    // Check for valid SQL keywords
    const validKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'];
    const hasValidKeyword = validKeywords.some(keyword => content.startsWith(keyword));
    
    if (!hasValidKeyword) {
      return false;
    }

    // Check for balanced parentheses
    const openParens = (statement.content.match(/\(/g) || []).length;
    const closeParens = (statement.content.match(/\)/g) || []).length;
    
    if (openParens !== closeParens) {
      return false;
    }

    return true;
  }

  /**
   * Checks if a line ends with a semicolon (outside of string literals)
   */
  private endsWithSemicolon(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed.endsWith(';')) {
      return false;
    }

    // Simple check: count quotes to see if we're likely inside a string
    const singleQuotes = (line.match(/'/g) || []).length;
    const doubleQuotes = (line.match(/"/g) || []).length;
    
    // If odd number of quotes, we might be inside a string literal
    // This is a simplified check - the character-by-character parsing above is more accurate
    return (singleQuotes % 2 === 0) && (doubleQuotes % 2 === 0);
  }

  /**
   * Enhanced method to check if a line ends with a semicolon outside of string literals
   */
  private endsWithSemicolonOutsideString(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed.endsWith(';')) {
      return false;
    }

    // More robust check: parse character by character to find the last semicolon
    let inStringLiteral = false;
    let stringDelimiter = '';
    let escapeNext = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = i < line.length - 1 ? line[i + 1] : '';

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inStringLiteral) {
        escapeNext = true;
        continue;
      }

      if (!inStringLiteral && (char === "'" || char === '"')) {
        inStringLiteral = true;
        stringDelimiter = char;
      } else if (inStringLiteral && char === stringDelimiter) {
        // Check for doubled quotes (SQL escape mechanism)
        if (nextChar === stringDelimiter) {
          i++; // Skip the next character
        } else {
          inStringLiteral = false;
          stringDelimiter = '';
        }
      }
    }

    // The semicolon at the end is only valid if we're not inside a string literal
    return !inStringLiteral;
  }

  /**
   * Creates a SqlStatement object from parsed content
   */
  private createSqlStatement(content: string, lineNumber: number, isMultiLine: boolean): SqlStatement | null {
    if (!content || content.trim().length === 0) {
      return null;
    }

    const trimmedContent = content.trim();
    const upperContent = trimmedContent.toUpperCase();
    
    // Determine statement type
    let type: SqlStatement['type'] = 'UNKNOWN';
    if (upperContent.startsWith('INSERT')) {
      type = 'INSERT';
    } else if (upperContent.startsWith('UPDATE')) {
      type = 'UPDATE';
    } else if (upperContent.startsWith('DELETE')) {
      type = 'DELETE';
    } else if (upperContent.startsWith('CREATE')) {
      type = 'CREATE';
    } else if (upperContent.startsWith('DROP')) {
      type = 'DROP';
    }

    // Extract table name
    const tableName = this.extractTableName(trimmedContent, type);

    return {
      type,
      table: tableName,
      content: trimmedContent,
      lineNumber,
      isMultiLine
    };
  }

  /**
   * Extracts table name from SQL statement
   */
  private extractTableName(statement: string, type: SqlStatement['type']): string {
    const upperStatement = statement.toUpperCase();
    
    try {
      switch (type) {
        case 'INSERT':
          const insertMatch = upperStatement.match(/INSERT\s+INTO\s+([`"]?)(\w+)\1/);
          return insertMatch ? insertMatch[2].toLowerCase() : 'unknown';
          
        case 'UPDATE':
          const updateMatch = upperStatement.match(/UPDATE\s+([`"]?)(\w+)\1/);
          return updateMatch ? updateMatch[2].toLowerCase() : 'unknown';
          
        case 'DELETE':
          const deleteMatch = upperStatement.match(/DELETE\s+FROM\s+([`"]?)(\w+)\1/);
          return deleteMatch ? deleteMatch[2].toLowerCase() : 'unknown';
          
        case 'CREATE':
          const createMatch = upperStatement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"]?)(\w+)\1/);
          return createMatch ? createMatch[2].toLowerCase() : 'unknown';
          
        case 'DROP':
          const dropMatch = upperStatement.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([`"]?)(\w+)\1/);
          return dropMatch ? dropMatch[2].toLowerCase() : 'unknown';
          
        default:
          return 'unknown';
      }
    } catch (error) {
      console.warn('Error extracting table name from statement:', statement, error);
      return 'unknown';
    }
  }
}