# Google Analytics Integration Guide

## Overview
Your Angular portfolio now includes Google Analytics 4 (GA4) integration with comprehensive event tracking.

## Setup Instructions

### 1. Get Your Google Analytics ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new property (or use existing)
3. Get your **Measurement ID** (format: `G-XXXXXXXXXX`)

### 2. Update Configuration

Replace `G-XXXXXXXXXX` with your actual Measurement ID in these files:

#### File: `src/index.html` (Line 5)
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX', {
    page_path: window.location.pathname,
  });
</script>
```

#### File: `src/app/shared/analytics.service.ts` (Line 27 and 35)
```typescript
gtag('config', 'G-XXXXXXXXXX', {
  page_path: event.urlAfterRedirects
});
```

## Features Included

### 1. Automatic Page Tracking
- Tracks all route changes automatically
- Records page views with full URL path
- Updates on Angular navigation

### 2. Login Page Tracking
The enhanced login page tracks:
- Page views
- Login attempts
- Successful logins
- Failed login attempts
- Password visibility toggles
- Error types (missing credentials, invalid credentials)

### 3. Custom Event Tracking
The `AnalyticsService` provides methods for:

#### Button Clicks
```typescript
this.analyticsService.trackButtonClick('Download Resume', 'Home Page');
```

#### Form Submissions
```typescript
this.analyticsService.trackFormSubmit('Contact Form', true);
```

#### User Interactions
```typescript
this.analyticsService.trackInteraction('scroll', 'reached_bottom');
```

#### AI Question Tracking
```typescript
this.analyticsService.trackQuestionView('question-1', 'Angular');
this.analyticsService.trackAIAnswerRequest('question-1', 'Angular');
```

#### Download Tracking
```typescript
this.analyticsService.trackDownload('resume.pdf', 'PDF');
```

#### Error Tracking
```typescript
this.analyticsService.trackError('API_ERROR', 'Failed to load questions');
```

#### Social Shares
```typescript
this.analyticsService.trackShare('LinkedIn', 'Portfolio');
```

#### Page Timing
```typescript
this.analyticsService.trackTiming('Page Load', 'home_page', 1234, 'Home');
```

## Usage Examples

### Track Button Clicks in Components

```typescript
import { Component } from '@angular/core';
import { AnalyticsService } from '../shared/analytics.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html'
})
export class HomeComponent {
  constructor(private analytics: AnalyticsService) {}

  downloadResume(): void {
    this.analytics.trackButtonClick('Download Resume', 'Home');
    // Your download logic
  }

  viewProject(projectName: string): void {
    this.analytics.trackInteraction('project_view', projectName);
    // Your project view logic
  }
}
```

### Track AI Question Interactions

```typescript
viewQuestion(question: any): void {
  this.analytics.trackQuestionView(question.id, question.category);
  // Display question
}

getAIAnswer(question: any): void {
  this.analytics.trackAIAnswerRequest(question.id, question.category);
  // Fetch AI answer
}
```

### Track Form Submissions

```typescript
submitContactForm(form: any): void {
  this.http.post('/api/contact', form).subscribe(
    success => {
      this.analytics.trackFormSubmit('Contact Form', true);
    },
    error => {
      this.analytics.trackFormSubmit('Contact Form', false);
      this.analytics.trackError('FORM_ERROR', error.message);
    }
  );
}
```

## Events Currently Tracked

### Login Page
- `page_view` - Login page viewed
- `login_attempt` - User attempts to login
- `login_success` - Successful authentication
- `login_failed` - Failed authentication
- `login_error` - Form validation errors
- `toggle_password` - Password visibility toggled

### Automatic Events
- `page_view` - All route changes
- `session_start` - First user interaction
- `first_visit` - New user visits

## Viewing Analytics Data

1. Go to [Google Analytics](https://analytics.google.com/)
2. Select your property
3. View reports:
   - **Realtime** - See current users
   - **Events** - See all tracked events
   - **Pages and screens** - Page view data
   - **User acquisition** - Traffic sources
   - **Engagement** - User behavior

## Custom Dashboards

Create custom dashboards in GA4 to monitor:
- Login success rate
- Most viewed questions
- AI answer request frequency
- Form submission rates
- Error frequencies
- User navigation patterns

## Privacy Considerations

### GDPR Compliance
If you have European users, add a cookie consent banner:

1. Install a cookie consent library
2. Only initialize Analytics after consent
3. Add privacy policy link

### Data Retention
Configure data retention in GA4:
- Go to Admin → Data Settings → Data Retention
- Choose retention period (2, 14, 26, 38, 50 months, or do not expire)

### IP Anonymization
GA4 automatically anonymizes IPs, but you can enhance privacy:

```typescript
gtag('config', 'G-XXXXXXXXXX', {
  anonymize_ip: true,
  allow_google_signals: false,
  allow_ad_personalization_signals: false
});
```

## Debugging

### Check if Analytics is Working

Open browser console and type:
```javascript
window.dataLayer
```

You should see an array with tracking data.

### Real-time Testing

1. Open GA4 Realtime report
2. Visit your site
3. See events appear in real-time

### Chrome Extension

Install **Google Analytics Debugger** extension to see detailed tracking info in console.

## Performance Impact

Google Analytics is loaded asynchronously and has minimal impact:
- ~17 KB gzipped
- Loads after page content
- Doesn't block page rendering

## Advanced Configuration

### Custom Dimensions

Track additional data:

```typescript
gtag('config', 'G-XXXXXXXXXX', {
  custom_map: {
    dimension1: 'user_role',
    dimension2: 'subscription_level'
  }
});

gtag('event', 'page_view', {
  user_role: 'admin',
  subscription_level: 'premium'
});
```

### Enhanced Ecommerce

If selling products/services:

```typescript
gtag('event', 'purchase', {
  transaction_id: 'T_12345',
  value: 25.00,
  currency: 'USD',
  items: [{
    item_id: 'SKU_12345',
    item_name: 'Consulting Service',
    price: 25.00,
    quantity: 1
  }]
});
```

## Troubleshooting

### Events Not Showing

1. Check browser console for errors
2. Verify Measurement ID is correct
3. Check ad blockers aren't blocking GA
4. Wait 24-48 hours for data processing

### Duplicate Page Views

If seeing duplicate tracking:
1. Check Analytics is only initialized once
2. Remove any duplicate GA scripts
3. Verify gtag is called once per navigation

## Best Practices

1. **Consistent Naming**: Use snake_case for event names
2. **Event Parameters**: Limit to 25 custom parameters per event
3. **Event Value**: Use numeric values for event_value
4. **Category Grouping**: Group related events with event_category
5. **Testing**: Test in dev before deploying to production

## Production Checklist

- [ ] Replace `G-XXXXXXXXXX` with real Measurement ID
- [ ] Test all tracked events
- [ ] Verify real-time data in GA4
- [ ] Add cookie consent (if required)
- [ ] Update privacy policy
- [ ] Set up custom dashboards
- [ ] Configure data retention
- [ ] Add team members to GA4 property
- [ ] Set up alerts for critical events

## Support

For issues or questions:
- [GA4 Documentation](https://support.google.com/analytics/answer/10089681)
- [GA4 Event Reference](https://support.google.com/analytics/answer/9322688)
- [gtag.js Reference](https://developers.google.com/tag-platform/gtagjs/reference)

---

**Note**: Remember to comply with local privacy laws and display appropriate privacy notices to users about data collection.
