const fs = require('fs');

let css = fs.readFileSync('docs/styles.css', 'utf-8');

// Replace Root Variables
css = css.replace(/:root \{[\s\S]*?\}/, `:root {
  --bg: #F3F1EE;
  --bg-ink: #292826;
  --card-bg: #FCFBF9;
  --item-bg: #F6F4F0;
  --line: rgba(0, 0, 0, 0.08);
  --primary: #F97316;
  --primary-hover: #EA580C;
  --muted: #78716C;
  --danger-bg: #FEF2F2;
  --danger-text: #DC2626;
  --radius-xl: 16px;
  --radius-md: 12px;
  --shadow-sm: 0 2px 5px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.06);
  --glass-border: rgba(0, 0, 0, 0.05);
}`);

css = css.replace(/\[data-theme="dark"\] \{[\s\S]*?\}/, `[data-theme="dark"] {
  --bg: #2B2A28;
  --bg-ink: #F4F3F0;
  --card-bg: #373533;
  --item-bg: #454340;
  --line: rgba(255, 255, 255, 0.08);
  --primary: #F97316;
  --primary-hover: #FB923C;
  --muted: #A8A29D;
  --danger-bg: rgba(220, 38, 38, 0.15);
  --danger-text: #FCA5A5;
  --shadow-sm: 0 2px 5px rgba(0,0,0,0.2);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.3);
  --glass-border: rgba(255, 255, 255, 0.05);
}`);

css = css.replace(/\[data-theme="dark"\] body \{[\s\S]*?\}/, `[data-theme="dark"] body { background-image: none; }`);
css = css.replace(/\[data-theme="dark"\] \.backdrop \{[\s\S]*?\}/, `[data-theme="dark"] .backdrop { background: none; }`);

css = css.replace(/body \{[\s\S]*?\}/, `body {
  margin: 0;
  color: var(--bg-ink);
  background-color: var(--bg);
  background-image: none;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}`);

css = css.replace(/\.backdrop \{[\s\S]*?\}/, `.backdrop { display: none; }`);

css = css.replace(/\.hero \{[\s\S]*?\}/, `.hero {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  background: var(--card-bg);
  box-shadow: var(--shadow-sm);
  padding: 2.5rem;
  text-align: center;
}`);

css = css.replace(/\.toolbar \{[\s\S]*?\}/, `.toolbar {
  margin: 2rem 0;
  padding: 1rem 1.5rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--card-bg);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}`);

css = css.replace(/\.btn-primary, \.btn-secondary \{[\s\S]*?\}/, `.btn-primary, .btn-secondary {
  width: 100%;
  font-size: 0.95rem;
  border-radius: 8px;
  border: none;
  padding: 0.55rem 1.4rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  font-family: inherit;
}`);

css = css.replace(/\.provider-card \{[\s\S]*?\}/, `.provider-card {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  background: var(--card-bg);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  animation: rise 400ms cubic-bezier(0.16, 1, 0.3, 1) both;
  transition: transform 0.2s, box-shadow 0.2s;
}`);

css = css.replace(/\.plan-item \{[\s\S]*?\}/, `.plan-item {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 1rem;
  background: var(--item-bg);
  box-shadow: var(--shadow-sm);
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}`);

css = css.replace(/\.plan-services \{[\s\S]*?\}/, `.plan-services {
  margin-top: 0.8rem;
  border-radius: 8px;
  background: var(--item-bg);
  padding: 0.8rem;
  border: 1px solid var(--glass-border);
}`);

css = css.replace(/\.buy-link \{[\s\S]*?\}/, `.buy-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  border-radius: 8px;
  padding: 0.4rem 1.1rem;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--primary);
  background: var(--item-bg);
  border: 1px solid var(--glass-border);
  transition: all 0.2s ease;
}`);

css = css.replace(/\.offer-name \{[\s\S]*?\}/, `.offer-name {
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  background: var(--primary);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  text-transform: uppercase;
}`);

css = css.replace(/\.offer-card \{[\s\S]*?\}/, `.offer-card {
  margin-top: 0.8rem;
  border-radius: 8px;
  background: var(--danger-bg);
  padding: 0.6rem 0.8rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid var(--glass-border);
}`);

// Dark mode overrides cleanup
css = css.replace(/\[data-theme="dark"\] \.plan-services,[\s\S]*?border-color: rgba\(255, 255, 255, 0\.1\);\s*\}/, ``);
css = css.replace(/\[data-theme="dark"\] \.offer-card \{[\s\S]*?\}/g, ``);
css = css.replace(/\[data-theme="dark"\] \.price-discount \{[\s\S]*?\}/g, ``);

fs.writeFileSync('docs/styles.css', css);
console.log('Update finished.');
