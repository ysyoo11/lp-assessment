export const AVAILABLE_SPECIAL_CHARACTERS = [
  '@',
  '!',
  '#',
  '$',
  '%',
  '^',
  '&',
  '*',
  '_',
  '+',
  '=',
  '?',
  '-'
] as const;
const escapeRegexChars = (chars: readonly string[]): string => {
  return chars
    .map((char) => char.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&'))
    .join('');
};
const SPECIAL_CHARS_REGEX = escapeRegexChars(AVAILABLE_SPECIAL_CHARACTERS);

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 32;
export const PASSWORD_REGEX = new RegExp(
  `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[${SPECIAL_CHARS_REGEX}])[A-Za-z\\d${SPECIAL_CHARS_REGEX}]{8,}$`
);
