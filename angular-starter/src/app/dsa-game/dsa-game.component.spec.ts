import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DsaGameComponent } from './dsa-game.component';

describe('DsaGameComponent', () => {
  let component: DsaGameComponent;
  let fixture: ComponentFixture<DsaGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DsaGameComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DsaGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
