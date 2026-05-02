import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { AuthService } from './auth.service';
import { DiscordCallbackComponent } from './discord-callback.component';

describe('DiscordCallbackComponent', () => {
  let queryParams: BehaviorSubject<Record<string, string>>;
  let auth: { completeDiscordCallback: ReturnType<typeof vi.fn> };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  async function createComponent(): Promise<ComponentFixture<DiscordCallbackComponent>> {
    await TestBed.configureTestingModule({
      imports: [DiscordCallbackComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { queryParams: queryParams.asObservable() },
        },
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DiscordCallbackComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    queryParams = new BehaviorSubject<Record<string, string>>({});
    auth = { completeDiscordCallback: vi.fn() };
    router = { navigateByUrl: vi.fn() };
  });

  it('shows an error when code or state is missing', async () => {
    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(auth.completeDiscordCallback).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Discord sign-in link is invalid');
  });

  it('exchanges valid callback params and navigates home', async () => {
    queryParams.next({ code: 'code-1', state: 'state-1' });
    auth.completeDiscordCallback.mockResolvedValue(undefined);

    const fixture = await createComponent();
    await fixture.whenStable();

    expect(auth.completeDiscordCallback).toHaveBeenCalledWith('code-1', 'state-1');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    expect(fixture.nativeElement.textContent).toContain('Signing in');
  });

  it('shows an error when callback exchange fails', async () => {
    queryParams.next({ code: 'code-1', state: 'state-1' });
    auth.completeDiscordCallback.mockRejectedValue(new Error('failed'));

    const fixture = await createComponent();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Discord sign-in failed');
  });
});
