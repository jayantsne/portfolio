import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

// Declare gtag function for TypeScript
declare let gtag: Function;

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  constructor(private router: Router) {}

  /**
   * Initialize Google Analytics tracking
   * Replace 'G-XXXXXXXXXX' with your actual Google Analytics ID
   */
  public init(): void {
    // Track route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      try {
        if (typeof gtag !== 'undefined') {
          gtag('config', 'G-XXXXXXXXXX', {
            page_path: event.urlAfterRedirects
          });
        }
      } catch (error) {
        console.error('Error tracking page view:', error);
      }
    });
  }

  /**
   * Track custom events
   */
  public trackEvent(
    eventName: string,
    eventCategory: string,
    eventLabel?: string,
    eventValue?: number
  ): void {
    try {
      if (typeof gtag !== 'undefined') {
        gtag('event', eventName, {
          event_category: eventCategory,
          event_label: eventLabel,
          value: eventValue
        });
      }
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  /**
   * Track button clicks
   */
  public trackButtonClick(buttonName: string, location: string): void {
    this.trackEvent('button_click', 'engagement', `${buttonName} - ${location}`);
  }

  /**
   * Track form submissions
   */
  public trackFormSubmit(formName: string, success: boolean): void {
    this.trackEvent(
      'form_submit',
      'engagement',
      formName,
      success ? 1 : 0
    );
  }

  /**
   * Track user interactions
   */
  public trackInteraction(interactionType: string, details: string): void {
    this.trackEvent('user_interaction', 'engagement', `${interactionType}: ${details}`);
  }

  /**
   * Track errors
   */
  public trackError(errorType: string, errorMessage: string): void {
    this.trackEvent('error', 'error_tracking', `${errorType}: ${errorMessage}`);
  }

  /**
   * Track page timing
   */
  public trackTiming(
    timingCategory: string,
    timingVar: string,
    timingValue: number,
    timingLabel?: string
  ): void {
    try {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'timing_complete', {
          name: timingVar,
          value: timingValue,
          event_category: timingCategory,
          event_label: timingLabel
        });
      }
    } catch (error) {
      console.error('Error tracking timing:', error);
    }
  }

  /**
   * Track AI question views
   */
  public trackQuestionView(questionId: string, category: string): void {
    this.trackEvent('question_view', 'questions', `${category} - ${questionId}`);
  }

  /**
   * Track AI answer requests
   */
  public trackAIAnswerRequest(questionId: string, category: string): void {
    this.trackEvent('ai_answer_request', 'ai_interaction', `${category} - ${questionId}`);
  }

  /**
   * Track downloads
   */
  public trackDownload(fileName: string, fileType: string): void {
    this.trackEvent('file_download', 'downloads', `${fileType} - ${fileName}`);
  }

  /**
   * Track social shares
   */
  public trackShare(platform: string, content: string): void {
    this.trackEvent('share', 'social', `${platform} - ${content}`);
  }
}
