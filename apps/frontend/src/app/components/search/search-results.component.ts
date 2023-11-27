import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { NbUserModule } from '@nebular/theme';
import { IconComponent } from '@momentum/frontend/icons';

@Component({
  selector: 'mom-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss'],
  standalone: true,
  imports: [IconComponent, NgIf, NgFor, NbUserModule]
})
export class SearchResultsComponent {
  @Input() usersResults: boolean;
  @Input() onlyUsers: boolean;
  @Input() onlyMaps: boolean;
  @Input() elems: any[];
  @Output() selectedURL: EventEmitter<string> = new EventEmitter();

  getElemName(elem: any): string {
    return this.usersResults ? elem.alias : elem.name;
  }
  getElemURL(elem: any): string {
    return this.usersResults ? '/profile/' + elem.id : '/maps/' + elem.id;
  }

  getElemPicture(elem: any) {
    return this.usersResults ? elem.avatarURL : elem.thumbnail.small;
  }

  shouldShowEmpty(): boolean {
    return this.usersResults
      ? !this.onlyMaps && this.elems && this.elems.length === 0
      : !this.onlyUsers && this.elems && this.elems.length === 0;
  }

  clickElem(elem: any) {
    this.selectedURL.emit(this.getElemURL(elem));
  }
}
