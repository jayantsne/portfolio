import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AzureAiLearnComponent } from './azure-ai-learn.component';

describe('AzureAiLearnComponent', () => {
  let component: AzureAiLearnComponent;
  let fixture: ComponentFixture<AzureAiLearnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AzureAiLearnComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AzureAiLearnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
