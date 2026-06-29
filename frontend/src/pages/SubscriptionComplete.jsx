import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PLANS, formatPrice } from '../data/subscriptionPlans';
import { getSubscription } from '../api/apiClient';

const cn = (...c) => c.filter(Boolean).join(' ');

const iconPaths = {
  check: ['M20 6L9 17l-5-5'],
  zap: ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  arrowRight: ['M5 12h14', 'M12 5l7 7-7 7'],
};

function Icon({ name, size = 16, color = 'currentColor', sw = 2 }) {
  const paths = iconPaths[name];
  if (!paths) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className="block shrink-0">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
};

function saveLocalSubscription(subscription) {
  try {
    const raw = localStorage.getItem('tiki_user');
    const user = raw ? JSON.parse(raw) : {};
    localStorage.setItem('tiki_user', JSON.stringify({
      ...user,
      isSubscribed: subscription.plan_id !== 'free',
      planId: subscription.plan_id,
      billing: subscription.billing,
      nextBillingAt: subscription.next_billing_at,
    }));
    window.dispatchEvent(new Event('tiki-auth-changed'));
  } catch {
    // Local cache sync is best-effort; the server subscription remains the source of truth.
  }
}

export default function SubscriptionComplete() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [subscription, setSubscription] = useState(state?.subscription || null);
  const [loading, setLoading] = useState(!state?.subscription);
  const isLoggedIn = Boolean(localStorage.getItem('tiki_access_token'));

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (subscription || !isLoggedIn) return;
    let cancelled = false;
    getSubscription()
      .then((data) => {
        if (cancelled) return;
        if (data?.plan_id && data.plan_id !== 'free') {
          setSubscription(data);
          saveLocalSubscription(data);
        } else {
          navigate('/subscription', { replace: true });
        }
      })
      .catch(() => navigate('/subscription', { replace: true }))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [subscription, isLoggedIn, navigate]);

  useEffect(() => {
    if (!subscription) return;
    saveLocalSubscription(subscription);
  }, [subscription]);

  useEffect(() => {
    if (!subscription) return;
    if (countdown <= 0) {
      navigate(isLoggedIn ? '/upload' : '/login', { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, isLoggedIn, navigate, subscription]);

  const plan = useMemo(() => {
    const planId = state?.plan?.id || subscription?.plan_id;
    return state?.plan || PLANS.find((item) => item.id === planId) || null;
  }, [state?.plan, subscription?.plan_id]);

  const billing = state?.billing || subscription?.billing || 'monthly';
  const amount = state?.paidAmount ?? subscription?.amount ?? 0;
  const nextBillingDate = formatDate(subscription?.next_billing_at);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFF] px-4">
        <div className="rounded-[18px] border border-[rgba(0,100,180,0.12)] bg-white px-6 py-5 text-[14px] font-semibold text-[#5A6F8A] shadow-[0_12px_32px_rgba(0,100,180,0.08)]">
          구독 정보를 확인하고 있어요...
        </div>
      </div>
    );
  }

  if (!subscription || !plan) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFF] px-4">
      <div className={cn('w-full max-w-[480px] transition-all duration-700', visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0')}>
        <div className="rounded-[24px] border border-[rgba(0,100,180,0.12)] bg-white p-8 text-center shadow-[0_16px_48px_rgba(0,100,180,0.1)]">
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-[rgba(0,153,204,0.15)]" style={{ animationDuration: '1.5s', animationIterationCount: 2 }} />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0099CC,#7C3AED)] shadow-[0_8px_24px_rgba(0,153,204,0.4)]">
              <Icon name="check" size={34} color="white" sw={2.5} />
            </div>
          </div>

          <h1 className="mb-2 text-[24px] font-bold tracking-[-0.5px] text-[#0D1B2A]">구독이 활성화됐어요</h1>
          <p className="mb-6 text-[14px] text-[#5A6F8A]">
            TIKI <span className="font-semibold text-[#0099CC]">{plan.name} 플랜</span>을 바로 사용할 수 있습니다.
          </p>

          <div className="mb-6 rounded-[14px] bg-[#F8FAFF] p-5 text-left">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[linear-gradient(135deg,#0099CC,#7C3AED)]">
                  <Icon name="zap" size={16} color="white" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#0D1B2A]">TIKI {plan.name}</p>
                  <p className="text-[11px] text-[#8A9AB0]">{billing === 'monthly' ? '월간 구독' : '연간 구독'}</p>
                </div>
              </div>
              <span className="rounded-full border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.1)] px-2.5 py-0.5 text-[11px] font-bold text-[#059669]">활성</span>
            </div>
            <div className="flex justify-between border-t border-[rgba(0,100,180,0.06)] pt-3 text-[13px]">
              <span className="text-[#5A6F8A]">결제 금액</span>
              <span className="font-bold text-[#0D1B2A]">{formatPrice(amount)}{amount > 0 ? ` / ${billing === 'monthly' ? '월' : '년'}` : ''}</span>
            </div>
            {nextBillingDate && (
              <div className="mt-2 flex justify-between text-[13px]">
                <span className="text-[#5A6F8A]">다음 결제 예정일</span>
                <span className="font-medium text-[#0D1B2A]">{nextBillingDate}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate(isLoggedIn ? '/upload' : '/login', { replace: true })}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(135deg,#0099CC,#7C3AED)] py-4 text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(0,153,204,0.35)] transition-all hover:shadow-[0_6px_24px_rgba(0,153,204,0.45)] hover:opacity-95"
          >
            지금 바로 시작하기
            <Icon name="arrowRight" size={16} color="white" />
          </button>

          <p className="text-[12px] text-[#8A9AB0]">{countdown}초 후 자동으로 이동합니다.</p>
        </div>

        <div className="mt-6 text-center">
          <span className="text-[18px] font-bold tracking-[-0.5px] text-[#0D1B2A]">
            <span className="text-[#0099CC]">TI</span>KI
          </span>
        </div>
      </div>
    </div>
  );
}
