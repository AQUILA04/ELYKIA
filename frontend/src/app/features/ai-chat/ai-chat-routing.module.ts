import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AiChatGuard } from './guards/ai-chat.guard';
import { AiChatPageComponent } from './pages/ai-chat-page/ai-chat-page.component';

const routes: Routes = [
  {
    path: '',
    component: AiChatPageComponent,
    canActivate: [AiChatGuard],
    data: { title: 'Elykia IA' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AiChatRoutingModule {}
