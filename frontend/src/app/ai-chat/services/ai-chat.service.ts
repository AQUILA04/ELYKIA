import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AiChatResponse,
  AiHealthStatus,
  ApiResponse,
  ConversationDetail,
  ConversationSummary,
} from '../models/ai-chat.models';
import { AiAdminStats } from '../models/ai-admin.models';

@Injectable({
  providedIn: 'root',
})
export class AiChatService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/ai`;

  constructor(private http: HttpClient) {}

  listConversations(): Observable<ConversationSummary[]> {
    return this.http
      .get<ApiResponse<ConversationSummary[]>>(`${this.apiUrl}/conversations`)
      .pipe(map((response) => response.data ?? []));
  }

  getConversation(id: string): Observable<ConversationDetail> {
    return this.http
      .get<ApiResponse<ConversationDetail>>(`${this.apiUrl}/conversations/${id}`)
      .pipe(map((response) => response.data));
  }

  createConversation(): Observable<ConversationSummary> {
    return this.http
      .post<ApiResponse<ConversationSummary>>(`${this.apiUrl}/conversations`, {})
      .pipe(map((response) => response.data));
  }

  deleteConversation(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.apiUrl}/conversations/${id}`)
      .pipe(map(() => undefined));
  }

  sendMessage(conversationId: string, message: string): Observable<AiChatResponse> {
    return this.http
      .post<ApiResponse<AiChatResponse>>(`${this.apiUrl}/chat`, { conversationId, message })
      .pipe(map((response) => response.data));
  }

  getHealth(): Observable<AiHealthStatus> {
    return this.http
      .get<ApiResponse<AiHealthStatus>>(`${this.apiUrl}/health`)
      .pipe(map((response) => response.data));
  }

  getDomains(): Observable<string[]> {
    return this.http
      .get<ApiResponse<string[]>>(`${this.apiUrl}/schema/domains`)
      .pipe(map((response) => response.data ?? []));
  }

  getAdminStats(days = 30): Observable<AiAdminStats> {
    return this.http
      .get<ApiResponse<AiAdminStats>>(`${this.apiUrl}/admin/stats`, { params: { days: String(days) } })
      .pipe(map((response) => response.data));
  }
}
