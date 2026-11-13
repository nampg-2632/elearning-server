import { MailTemplate } from './enums/mail-template.enum';
import { MailRenderer } from './mail-renderer';
import { MAIL_SUBJECTS } from './mail.constants';

describe('MailRenderer', () => {
  const renderer = new MailRenderer();
  const student = { fullName: 'Nam', courseName: 'TOEIC 600' };

  it.each(Object.values(MailTemplate))(
    'renders %s in Vietnamese then English, as HTML and text',
    (template) => {
      const mail = renderer.render({
        to: 'nam@example.com',
        template,
        // Every variable any template reads; extra ones are ignored.
        context: { ...student, email: 'nam@example.com', reason: null },
      } as never);

      expect(mail.subject).toBe(MAIL_SUBJECTS[template]);
      const subjectOf =
        template === MailTemplate.Welcome ? 'nam@example.com' : 'TOEIC 600';
      for (const body of [mail.html, mail.text]) {
        expect(body).toContain('Chào Nam');
        expect(body).toContain(subjectOf);
        expect(body.indexOf('Chào Nam')).toBeLessThan(body.indexOf('Hi Nam'));
      }
      expect(mail.html).toContain(`<title>${MAIL_SUBJECTS[template]}</title>`);
      expect(mail.text).not.toContain('<');
    },
  );

  it('shows the reason in both languages only when there is one', () => {
    const withReason = renderer.render({
      to: 'nam@example.com',
      template: MailTemplate.CourseRejected,
      context: { ...student, reason: 'Thiếu thông tin' },
    });
    expect(withReason.html).toContain('Lý do: Thiếu thông tin');
    expect(withReason.html).toContain('Reason: Thiếu thông tin');
    expect(withReason.text).toContain('Lý do: Thiếu thông tin');

    const withoutReason = renderer.render({
      to: 'nam@example.com',
      template: MailTemplate.CourseRevoked,
      context: { ...student, reason: null },
    });
    expect(withoutReason.html).not.toContain('Lý do');
    expect(withoutReason.text).not.toContain('Reason');
  });

  it('escapes variables in HTML but keeps them as typed in text', () => {
    const mail = renderer.render({
      to: 'nam@example.com',
      template: MailTemplate.CourseApproved,
      context: { fullName: '<b>Nam</b>', courseName: 'A & B' },
    });

    expect(mail.html).toContain('&lt;b&gt;Nam&lt;/b&gt;');
    expect(mail.html).toContain('A &amp; B');
    expect(mail.text).toContain('Chào <b>Nam</b>');
    expect(mail.text).toContain('"A & B"');
  });

  it('fails on a variable missing from the context', () => {
    expect(() =>
      renderer.render({
        to: 'nam@example.com',
        template: MailTemplate.CourseApproved,
        context: { fullName: 'Nam' },
      } as never),
    ).toThrow(/courseName/);
  });
});
