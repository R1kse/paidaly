import { useState } from 'react';
import { api } from '../../api/client';
import { useCartStore } from '../../store/cart';
import { useNavigate } from 'react-router-dom';

type MealGoal = 'gentle_gi' | 'weight_loss' | 'high_protein' | 'low_fat' | 'recovery';

const GOALS: { value: MealGoal; label: string; icon: string; desc: string }[] = [
  { value: 'gentle_gi',    label: 'Щадящее для ЖКТ',    icon: '🌿', desc: 'Гастрит, СРК, мягкое питание' },
  { value: 'weight_loss',  label: 'Снижение веса',       icon: '⚖️', desc: 'Дефицит калорий, сбалансировано' },
  { value: 'high_protein', label: 'Высокобелковое',      icon: '💪', desc: 'Спорт, набор мышечной массы' },
  { value: 'low_fat',      label: 'Низкожировое',        icon: '🫀', desc: 'Желчный пузырь, печень' },
  { value: 'recovery',     label: 'Восстановление ЖКТ',  icon: '🌡️', desc: 'После расстройства, диета' },
];

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус',
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);
}

export default function ClientMealPlanPage() {
  const [goal, setGoal] = useState<MealGoal>('gentle_gi');
  const [calories, setCalories] = useState(1800);
  const [days, setDays] = useState(3);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [error, setError] = useState('');
  const [addedDay, setAddedDay] = useState<number | null>(null);
  const cart = useCartStore();
  const navigate = useNavigate();

  const generate = async () => {
    setLoading(true);
    setError('');
    setPlan(null);
    try {
      const { data } = await api.post('/ai/meal-plan', { goal, calorieTarget: calories, daysCount: days });
      setPlan(data);
    } catch {
      setError('Не удалось сгенерировать рацион. Проверьте соединение.');
    } finally {
      setLoading(false);
    }
  };

  const addDayToCart = (day: any) => {
    cart.clear();
    for (const meal of day.meals) {
      for (const item of meal.items) {
        cart.addLine({
          lineId: `ai-${item.id}-${Date.now()}`,
          menuItemId: item.id,
          title: item.title,
          basePrice: item.price,
          quantity: 1,
          modifierOptionIds: [],
          modifiersLabel: '',
        });
      }
    }
    setAddedDay(day.day);
    setTimeout(() => navigate('/client/checkout'), 600);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #3A9E5F 0%, #8BC34A 100%)', padding: '24px 20px' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
        <h2 style={{ margin: 0, color: '#fff', fontSize: 22, fontWeight: 900 }}>AI-рацион питания</h2>
        <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600 }}>
          Персональный план из блюд нашего меню на основе ваших целей
        </p>
      </div>

      {/* Settings */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Goal */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Цель питания</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {GOALS.map((g) => (
              <button
                key={g.value}
                onClick={() => setGoal(g.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                  border: goal === g.value ? '2px solid var(--green)' : '1.5px solid var(--line)',
                  background: goal === g.value ? 'rgba(58,158,95,0.07)' : 'var(--bg-tint)',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{g.icon}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: goal === g.value ? 'var(--green)' : 'var(--ink)' }}>{g.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{g.desc}</div>
                </div>
                {goal === g.value && (
                  <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: 'var(--green)', display: 'grid', placeItems: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M4 12l5 5L20 6"/></svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Calories & Days */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
              Калории в день
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[1400, 1600, 1800, 2000, 2200].map((c) => (
                <button
                  key={c}
                  onClick={() => setCalories(c)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    border: calories === c ? '2px solid var(--green)' : '1.5px solid var(--line)',
                    background: calories === c ? 'rgba(58,158,95,0.1)' : 'var(--bg-tint)',
                    color: calories === c ? 'var(--green)' : 'var(--ink)',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
              Дней в плане
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 3, 5].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  style={{
                    padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    border: days === d ? '2px solid var(--green)' : '1.5px solid var(--line)',
                    background: days === d ? 'rgba(58,158,95,0.1)' : 'var(--bg-tint)',
                    color: days === d ? 'var(--green)' : 'var(--ink)',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', borderRadius: 10, color: '#991B1B', fontSize: 13, fontWeight: 600 }}>{error}</div>}

        <button
          onClick={generate}
          disabled={loading}
          style={{
            padding: '14px', borderRadius: 14, border: 'none', cursor: loading ? 'default' : 'pointer',
            background: loading ? 'var(--line)' : 'var(--green)', color: '#fff',
            fontWeight: 900, fontSize: 15, fontFamily: 'Nunito, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                <path d="M12 3a9 9 0 019 9"/>
              </svg>
              AI составляет рацион...
            </>
          ) : '✨ Составить рацион'}
        </button>
      </div>

      {/* Plan */}
      {plan && (
        <>
          {plan.tips?.length > 0 && (
            <div className="card" style={{ background: 'rgba(58,158,95,0.06)', border: '1.5px solid rgba(58,158,95,0.2)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>💡 Рекомендации</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {plan.tips.map((tip: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                    <span style={{ color: 'var(--green)', flexShrink: 0 }}>•</span>
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan.days?.map((day: any) => {
            const dayTotal = day.meals.reduce((s: number, m: any) => s + (m.totalCalories ?? 0), 0);
            const dayPrice = day.meals.reduce((s: number, m: any) =>
              s + m.items.reduce((ms: number, i: any) => ms + (i.price ?? 0), 0), 0);
            return (
              <div key={day.day} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 17 }}>День {day.day}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{dayTotal} ккал · {fmtMoney(dayPrice)}</div>
                  </div>
                  <button
                    onClick={() => addDayToCart(day)}
                    style={{
                      padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: addedDay === day.day ? 'var(--green)' : 'rgba(58,158,95,0.1)',
                      color: addedDay === day.day ? '#fff' : 'var(--green)',
                      fontWeight: 800, fontSize: 13, fontFamily: 'Nunito, sans-serif',
                      transition: 'all 0.2s',
                    }}
                  >
                    {addedDay === day.day ? '✓ Добавлено!' : '🛒 Заказать день'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {day.meals?.map((meal: any, mi: number) => (
                    <div key={mi}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>
                        {MEAL_LABELS[meal.type] ?? meal.typeLabel ?? meal.type} · {meal.totalCalories ?? '—'} ккал
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {meal.items?.map((item: any, ii: number) => (
                          <div key={ii} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-tint)', borderRadius: 10 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, flex: 1, marginRight: 8 }}>{item.title}</div>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                              {item.calories && <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{item.calories} ккал</span>}
                              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>{fmtMoney(item.price)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
