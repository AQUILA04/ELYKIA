# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth\app-availability.spec.ts >> Auth availability >> shows unavailable message when customer space flag is disabled @smoke
- Location: e2e\specs\auth\app-availability.spec.ts:5:7

# Error details

```
Error: browserType.launch: Executable doesn't exist at C:\Users\kahonsu\AppData\Local\Temp\cursor-sandbox-cache\4e5bf0755e12ee1637e2c067c7f42e63\playwright\chromium_headless_shell-1228\chrome-headless-shell-win64\chrome-headless-shell.exe
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```