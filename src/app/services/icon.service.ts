import { Injectable } from '@angular/core';
import * as svgToPng from 'save-svg-as-png'
import { HttpClient } from '@angular/common/http';
import { DataService } from './data.service';
import { TagsService } from './tags.service';


const circleMarkerModelPath = `<path fill="{{color}}" d="M12,0C5.371,0,0,5.903,0,13.187c0,0.829,0.079,1.643,0.212,2.424c0.302,1.785,0.924,3.448,1.81,4.901
l0.107,0.163L11.965,36l9.952-15.393l0.045-0.064c0.949-1.555,1.595-3.343,1.875-5.269C23.934,14.589,24,13.899,24,13.187
C24,5.905,18.629,0,12,0z"/>`;

const squareMarkerModelPath = `<path fill="{{color}}" d="M20.103,0.57H2.959c-1.893,0-3.365,0.487-3.365,2.472l-0.063,18.189c0,1.979,1.526,3.724,3.418,3.724h4.558
 l4.01,11.545l3.966-11.545h4.56c1.894,0,3.488-1.744,3.488-3.724V4.166C23.531,2.18,21.996,0.57,20.103,0.57z"/>`

const pentaMarkerModelPath = `<polygon fill="{{color}}" points="0.5,11.516 6.516,-0.5 18.5,-0.5 24.5,11.5 12.5,35.5 	"/>`
const xmlHeader = '<svg version="1.1" id="marker-circle-blue" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px"  y="0px" width="24px" height="36px" viewBox="0 0 24 36" enable-background="new 0 0 24 36" xml:space="preserve">';

const xmlEnd = '</svg>'

@Injectable({
  providedIn: 'root'
})
export class IconService {

  constructor(
    private http: HttpClient,
    public dataService: DataService,
    public tagsService: TagsService) { }


  getSprites() {
    return this.http.get('assets/mapStyle/sprites/sprites.json')
      .toPromise()
  }

  getIconSvg(iconName) {
    return this.http.get(`assets/mapStyle/IconsSVG/${iconName}.svg`, { responseType: 'text' })
      .toPromise()
  }

  async generateMarkerByIconId(iconId) {
    if (!/^circle/.test(iconId) && !/^square/.test(iconId) && !/^penta/.test(iconId)) {
      return;
    }
    const splitedId: string[] = iconId.split('-');
    const shape = splitedId[0];
    const color = splitedId[1];
    let iconName = splitedId.slice(2).join('-')

    if (shape && color && !iconName) {
      iconName = 'maki-circle-15'
    }

    if (!shape || !iconName || !color) {
      return;
    }

    let svgStr = await this.getIconSvg(iconName);
    let model;
    if (shape == 'circle') {
      model = circleMarkerModelPath.replace('{{color}}', color);
    } else if (shape == 'square') {
      model = squareMarkerModelPath.replace('{{color}}', color);
    } else if (shape == 'penta') {
      model = pentaMarkerModelPath.replace('{{color}}', color);
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(svgStr, "text/xml");
    let svgPaths: any = xmlDoc.getElementsByTagName("svg")[0].getElementsByTagName("path");
    let iconPaths = [];
    for (let i = 0; i < svgPaths.length; i++) {
      let p = svgPaths[i];
      let d = p.getAttribute('d');
      iconPaths.push(`<path fill="#FFFFFF" transform="translate(4.5 4.5)" d="${d}"/>`)
    }
    const SvgMarker = xmlHeader + model + iconPaths.join(' ') + xmlEnd;
    const svg = parser.parseFromString(SvgMarker, "image/svg+xml").childNodes[0];
    return svgToPng.svgAsPngUri(svg, {});
  }

  async getMissingSpirtes(){

    let shapes = ['circle', 'square', 'penta'];

    const sprites = await this.getSprites();
    const spritesNames = Object.keys(sprites); // => liste des id icon utilisés
    let tagsConfig = this.tagsService.getFullTags();
    let keys = [];
    let missingIcons = [];
    for (let i = 0; i < tagsConfig.length; i++) {
      const c = tagsConfig[i];
      for (let shape of shapes){
        let iconId = `${shape}-${c.markerColor}-${c.icon}`;
        if (!missingIcons.includes(iconId) && !spritesNames.includes(iconId) && !(await this.dataService.getIconCache(iconId))){
          missingIcons.push(iconId)
        }
      }
    }
    return missingIcons;
  }


}
