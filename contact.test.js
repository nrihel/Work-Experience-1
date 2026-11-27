/** @jest-environment jsdom */

const contactScriptPath = require.resolve('./public/js/contact.js');
const successMessage = "Thanks, we'll be in touch within one business day.";

let form;
let statusEl;
let button;
let fetchMock;
let startedAt;
let currentTime;

async function submitForm() {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await Promise.resolve();
  await Promise.resolve();
}

function fillInContactDetails() {
  form.elements.name.value = 'Taylor Example';
  form.elements.email.value = 'taylor@example.com';
  form.elements.message.value = 'I would like to learn more.';
}

beforeEach(() => {
  document.body.innerHTML = `
    <form id="contact-form">
      <select name="company_website">
        <option value="">Select a website type</option>
        <option value="business">Business website</option>
      </select>
      <input name="name">
      <input name="email">
      <textarea name="message"></textarea>
      <button type="submit">Send message</button>
    </form>
    <p id="form-status"></p>
  `;

  form = document.getElementById('contact-form');
  statusEl = document.getElementById('form-status');
  button = form.querySelector('button[type="submit"]');
  startedAt = 1_000_000;
  currentTime = startedAt;

  jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
  fetchMock = jest.fn().mockResolvedValue({
    json: jest.fn().mockResolvedValue({ ok: true }),
  });
  global.fetch = fetchMock;

  jest.isolateModules(() => {
    require(contactScriptPath);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
  document.body.innerHTML = '';
});

test('shows success without submitting when the honeypot is filled', async () => {
  form.elements.company_website.value = 'business';
  currentTime += 5000;

  await submitForm();

  expect(fetchMock).not.toHaveBeenCalled();
  expect(statusEl.textContent).toBe(successMessage);
  expect(statusEl.classList).toContain('form-status--success');
  expect(form.elements.company_website.value).toBe('');
  expect(button.disabled).toBe(false);
});

test('shows success without submitting when submitted in under two seconds', async () => {
  currentTime += 1999;
  fillInContactDetails();

  await submitForm();

  expect(fetchMock).not.toHaveBeenCalled();
  expect(statusEl.textContent).toBe(successMessage);
  expect(statusEl.classList).toContain('form-status--success');
  expect(button.disabled).toBe(false);
});

test('submits the form after two seconds and shows success', async () => {
  currentTime += 2000;
  fillInContactDetails();

  await submitForm();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith('/contact', expect.objectContaining({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }));
  const submittedData = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(submittedData).toEqual({
    company_website: '',
    name: 'Taylor Example',
    email: 'taylor@example.com',
    message: 'I would like to learn more.',
    formStartedAt: startedAt,
  });
  expect(statusEl.textContent).toBe(successMessage);
  expect(statusEl.classList).toContain('form-status--success');
  expect(button.disabled).toBe(false);
});
