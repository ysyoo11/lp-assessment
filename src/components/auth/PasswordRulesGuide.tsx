import {
  AVAILABLE_SPECIAL_CHARACTERS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH
} from '@/constants/auth';

export default function PasswordRulesGuide() {
  return (
    <ul className='text-xs text-gray-500'>
      <li>
        * Password must be {PASSWORD_MIN_LENGTH}-{PASSWORD_MAX_LENGTH}{' '}
        characters long.
      </li>
      <li>
        * Must include uppercase letters, lowercase letters, numbers, and
        special characters.
      </li>
      <li>
        * Available special characters: {AVAILABLE_SPECIAL_CHARACTERS.join(' ')}
      </li>
    </ul>
  );
}
