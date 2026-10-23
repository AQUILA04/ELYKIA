import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StockChannel } from '../../models/stock-channel';
import { StockChannelService } from '../../services/stock-channel.service';

@Component({
  selector: 'app-stock-channel-segment',
  templateUrl: './stock-channel-segment.component.html',
  styleUrls: ['./stock-channel-segment.component.scss']
})
export class StockChannelSegmentComponent {
  @Input() channel: StockChannel = 'credit';
  @Output() channelChange = new EventEmitter<StockChannel>();

  constructor(public channels: StockChannelService) {}

  select(channel: StockChannel): void {
    if (channel === this.channel) {
      return;
    }
    if (channel === 'credit' && !this.channels.canUseCredit()) {
      return;
    }
    if (channel === 'tontine' && !this.channels.canUseTontine()) {
      return;
    }
    this.channelChange.emit(channel);
  }
}
