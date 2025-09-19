import { Component, input } from '@angular/core';

@Component({
  selector: 'reward',
  standalone: true,
  imports: [],
  styleUrl: './reward.component.scss',
  templateUrl: './reward.component.html',
})
export class RewardComponent {
  readonly reward = input.required<number>();
}
