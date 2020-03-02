import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss'],
})
export class IconComponent implements OnInit {

  @Input() jsonSprites;
  @Input() icon;
  currentSpriteConfig
  styleBackgroundPosition;
  devicePixelRatio;

  constructor() { }

  ngOnInit() {
    this.devicePixelRatio = window.devicePixelRatio > 1 ? 2 : 1;;
  }



}
