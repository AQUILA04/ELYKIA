import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AiChatRoutingModule } from './ai-chat-routing.module';
import { AiChatPageComponent } from './pages/ai-chat-page/ai-chat-page.component';
import { ConversationSidebarComponent } from './components/conversation-sidebar/conversation-sidebar.component';
import { ChatMessageListComponent } from './components/chat-message-list/chat-message-list.component';
import { ChatInputComponent } from './components/chat-input/chat-input.component';
import { AiAdminStatsComponent } from './components/ai-admin-stats/ai-admin-stats.component';
import { NgxPermissionsModule } from 'ngx-permissions';

@NgModule({
  declarations: [
    AiChatPageComponent,
    ConversationSidebarComponent,
    ChatMessageListComponent,
    ChatInputComponent,
    AiAdminStatsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    AiChatRoutingModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NgxPermissionsModule.forChild(),
  ],
})
export class AiChatModule {}
