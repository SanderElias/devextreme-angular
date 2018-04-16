
import { NgModule, NgZone } from '@angular/core';

import * as eventsEngine from 'devextreme/events/core/events_engine';

@NgModule({})
export class DxIntegrationModule {
    constructor(ngZone: NgZone) {
        eventsEngine.set({
            on: function(...args) {
                ngZone.runOutsideAngular(() => {
                    this.callBase.apply(this, args);
                });
            }
        });
    }
}
