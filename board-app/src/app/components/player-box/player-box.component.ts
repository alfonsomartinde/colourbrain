import { Component, Input } from '@angular/core';

@Component({
  selector: 'player-box',
  standalone: true,
  imports: [],
  styleUrl: './player-box.component.scss',
  templateUrl: './player-box.component.html',
})
export class PlayerBoxComponent {
  @Input({ required: true }) name: string = '';
  @Input({ required: true }) points: number = 0;
  @Input({ required: true }) isWinner: boolean = false;
  @Input({ required: true }) answers: number[] = [];
  @Input({ required: true }) colors: Record<number, string> = {};
  @Input() showAnswers: boolean = false;

  colorHex = (id: number) => this.colors[id] ?? '#000000';
}


