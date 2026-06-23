/** UTF-8 emoji constants — single source of truth (prevents Windows encoding corruption). */

export const NAV = {
  overview: '\u{1F4CA}',
  users: '\u{1F465}',
  forms: '\u{1F4CB}',
  ats: '\u{1F3AF}',
  attendance: '\u{1F4C8}'
};

export const ROLE = {
  manager: '\u{1F454}',
  employee: '\u{1F464}'
};

export const FORM = {
  vacation: '\u{1F3D6}\uFE0F',
  sick_leave: '\u{1F3E5}',
  excuse: '\u{1F550}',
  extra_hours: '\u23F1\uFE0F',
  mission: '\u2708\uFE0F',
  wfh: '\u{1F3E0}'
};

export const ACTION = {
  approve: '\u2705',
  reject: '\u274C',
  delete: '\u{1F5D1}\uFE0F',
  edit: '\u270F\uFE0F',
  resetPassword: '\u{1F511}',
  draft: '\u{1F4C4}',
  print: '\u{1F5A8}\uFE0F',
  search: '\u{1F50D}',
  save: '\u{1F4BE}',
  close: '\u2715',
  processing: '\u23F3',
  warning: '\u26A0\uFE0F',
  star: '\u2B50',
  flag: '\u{1F6A9}',
  target: '\u{1F3AF}',
  write: '\u{1F4DD}',
  money: '\u{1F4B0}',
  hrAwaiting: '\u{1F468}\u200D\u{1F4BC}',
  available: '\u2705',
  low: '\u26A0\uFE0F'
};

export const MISC = {
  bullet: '\u2022',
  user: '\u{1F464}',
  chart: '\u{1F4CA}',
  beach: '\u{1F3D6}\uFE0F',
  plane: '\u2708\uFE0F'
};

/** Map form type string to icon emoji */
export function formTypeIcon(type) {
  return FORM[type] || FORM.wfh;
}
