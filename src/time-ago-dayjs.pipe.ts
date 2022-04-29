/* ngx-moment (c) 2015, 2016 Uri Shaked / MIT Licence */

import { Pipe, ChangeDetectorRef, PipeTransform, OnDestroy, NgZone } from '@angular/core';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// import moment from 'moment';

@Pipe({ name: 'amTimeAgo', pure: false })
export class TimeAgoDayJSPipe implements PipeTransform, OnDestroy {
  private currentTimer: number | null;

  private lastTime: Number;
  private lastValue: dayjs.ConfigType;
  private lastOmitSuffix: boolean;
  private lastLocale?: string;
  private lastText: string;
  private formatFn: (m: dayjs.Dayjs) => string;

  constructor(private cdRef: ChangeDetectorRef, private ngZone: NgZone) {}

  format(d: dayjs.Dayjs) {
    return d.from(dayjs(), this.lastOmitSuffix);
  }

  transform(
    value: dayjs.ConfigType,
    omitSuffix?: boolean,
    formatFn?: (d: dayjs.Dayjs) => string,
  ): string {
    if (this.hasChanged(value, omitSuffix)) {
      this.lastTime = this.getTime(value);
      this.lastValue = value;
      this.lastOmitSuffix = omitSuffix;
      this.lastLocale = this.getLocale(value);
      this.formatFn = formatFn || this.format.bind(this);
      this.removeTimer();
      this.createTimer();
      this.lastText = this.formatFn(dayjs(value));
    } else {
      this.createTimer();
    }

    return this.lastText;
  }

  ngOnDestroy(): void {
    this.removeTimer();
  }

  private createTimer() {
    if (this.currentTimer) {
      return;
    }

    const momentInstance = dayjs(this.lastValue);
    const timeToUpdate = this.getSecondsUntilUpdate(momentInstance) * 1000;

    this.currentTimer = this.ngZone.runOutsideAngular(() => {
      if (typeof window !== 'undefined') {
        return window.setTimeout(() => {
          this.lastText = this.formatFn(dayjs(this.lastValue));

          this.currentTimer = null;
          this.ngZone.run(() => this.cdRef.markForCheck());
        }, timeToUpdate);
      } else {
        return null;
      }
    });
  }

  private removeTimer() {
    if (this.currentTimer) {
      window.clearTimeout(this.currentTimer);
      this.currentTimer = null;
    }
  }

  private getSecondsUntilUpdate(momentInstance: dayjs.Dayjs) {
    const howOld = Math.abs(dayjs().diff(momentInstance, 'minute'));
    if (howOld < 1) {
      return 1;
    } else if (howOld < 60) {
      return 30;
    } else if (howOld < 180) {
      return 300;
    } else {
      return 3600;
    }
  }

  private hasChanged(value: dayjs.ConfigType, omitSuffix?: boolean): boolean {
    return (
      this.getTime(value) !== this.lastTime ||
      this.getLocale(value) !== this.lastLocale ||
      omitSuffix !== this.lastOmitSuffix
    );
  }

  private getTime(value: dayjs.ConfigType): number {
    return dayjs(value).valueOf(); // no need to check because dayjs() is idempotent
    // if (dayjs.isDate(value)) {
    //   return value.getTime();
    // } else if (dayjs.isDayjs(value)) {
    //   return value.valueOf();
    // } else {
    //   return dayjs(value).valueOf();
    // }
  }

  private getLocale(value: dayjs.ConfigType): string | null {
    return dayjs.isDayjs(value) ? value.locale() : dayjs.locale();
  }
}
