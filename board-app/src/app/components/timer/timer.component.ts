import { Component, input } from "@angular/core";

@Component({
  selector: 'timer',
  standalone: true,
  imports: [],
  styleUrl: './timer.component.scss',
  templateUrl: './timer.component.html',
})
export class TimerComponent {
  readonly secondsLeft = input.required<number>();
}