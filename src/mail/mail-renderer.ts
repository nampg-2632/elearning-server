import { Injectable } from '@nestjs/common';
import Handlebars, { type TemplateDelegate } from 'handlebars';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MailTemplate } from './enums/mail-template.enum';
import { MAIL_SUBJECTS } from './mail.constants';
import type { MailJob, RenderedMail } from './mail.types';

const TEMPLATE_DIR = join(__dirname, 'templates');

const read = (file: string): string =>
  readFileSync(join(TEMPLATE_DIR, file), 'utf8');

interface CompiledTemplate {
  html: TemplateDelegate;
  text: TemplateDelegate;
}

// Templates are compiled once, on first use. HTML output escapes every
// variable; the text part is not HTML, so it is left as typed.
@Injectable()
export class MailRenderer {
  private readonly handlebars = Handlebars.create();
  private readonly compiled = new Map<MailTemplate, CompiledTemplate>();

  constructor() {
    this.handlebars.registerPartial('layout', read('layout.html.hbs'));
  }

  render(job: MailJob): RenderedMail {
    const template = this.compile(job.template);
    const context = { ...job.context, subject: MAIL_SUBJECTS[job.template] };
    return {
      subject: MAIL_SUBJECTS[job.template],
      html: template.html(context),
      text: template.text(context),
    };
  }

  private compile(name: MailTemplate): CompiledTemplate {
    let template = this.compiled.get(name);
    if (!template) {
      template = {
        html: this.handlebars.compile(read(`${name}.html.hbs`), {
          strict: true,
        }),
        text: this.handlebars.compile(read(`${name}.text.hbs`), {
          strict: true,
          noEscape: true,
        }),
      };
      this.compiled.set(name, template);
    }
    return template;
  }
}
