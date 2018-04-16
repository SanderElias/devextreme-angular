import { EventEmitter, NgZone } from '@angular/core';
import { DxComponent } from './component';

interface IEventSubscription {
    handler: any;
    unsubscribe: () => void;
}

export class NgEventsStrategy {
    private subscriptions: { [key: string]: IEventSubscription[] } = {};
    private events: { [key: string]: EventEmitter<any> } = {};

    constructor(private ngZone: NgZone, private instance: any) { }

    hasEvent(name: string) {
        return this.getEmitter(name).observers.length;
    }

    fireEvent(name, args) {
        let emitter = this.getEmitter(name);
        if (emitter.observers.length) {
            this.ngZone.run(() => emitter.next(args && args[0]));
        }
    }

    on(name, handler) {
        let eventSubscriptions = this.subscriptions[name] || [],
            subcription = this.getEmitter(name).subscribe(handler.bind(this.instance)),
            unsubscribe = subcription.unsubscribe.bind(subcription);

        eventSubscriptions.push({ handler, unsubscribe });
        this.subscriptions[name] = eventSubscriptions;
    }

    off(name, handler) {
        let eventSubscriptions = this.subscriptions[name] || [];

        if (handler) {
            eventSubscriptions.some((subscription, i) => {
                if (subscription.handler === handler) {
                    subscription.unsubscribe();
                    eventSubscriptions.splice(i, 1);
                    return true;
                }
            });
        } else {
            eventSubscriptions.forEach(subscription => {
                subscription.unsubscribe();
            });
            eventSubscriptions.splice(0, eventSubscriptions.length);
        }
    }

    dispose() {}

    public addEmitter(eventName: string, emitter: EventEmitter<any>) {
        this.events[eventName] = emitter;
    }

    private getEmitter(eventName: string): EventEmitter<any> {
        if (!this.events[eventName]) {
            this.events[eventName] = new EventEmitter();
        }
        return this.events[eventName];
    }
}

interface IRememberedEvent {
    name: string;
    context: EmitterHelper;
}

let events: IRememberedEvent[] = [];
let onStableSubscription: IEventSubscription = null;

let createOnStableSubscription = function(ngZone: NgZone, fireNgEvent: Function) {
    if (onStableSubscription) {
        return;
    }

    onStableSubscription = ngZone.onStable.subscribe(function() {
        onStableSubscription.unsubscribe();
        onStableSubscription = null;

        ngZone.run(() => {
            events.forEach(event => {
                let value = event.context.component[event.name];

                fireNgEvent.call(event.context, event.name + 'Change', [value]);
            });
        });

        events = [];
    });
};

export class EmitterHelper {
    lockedValueChangeEvent = false;

    constructor(ngZone: NgZone, public component: DxComponent) {
        createOnStableSubscription(ngZone, this.fireNgEvent);
    }

    fireNgEvent(eventName: string, eventArgs: any) {
        if (this.lockedValueChangeEvent && eventName === 'valueChange') {
            return;
        }
        let emitter = this.component[eventName];
        if (emitter) {
            emitter.next(eventArgs && eventArgs[0]);
        }
    }

    createEmitters(eventNames: any[]) {
        eventNames.forEach(event => {
            this.component[event.emit] = new EventEmitter();
        });
    }

    rememberEvent(name: string) {
        events.push({ name: name, context: this });
    }
}
