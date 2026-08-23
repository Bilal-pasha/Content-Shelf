import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  strongPasswordSchema,
} from './auth.schemas';

describe('loginSchema', () => {
  it('accepts a valid email/password pair', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'anything6+',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'password' });
    expect(result.success).toBe(false);
  });

  it('rejects a too-short password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '123' });
    expect(result.success).toBe(false);
  });
});

describe('strongPasswordSchema', () => {
  it.each([
    ['Short1!', false, 'too short'],
    ['alllowercase1!', false, 'no uppercase'],
    ['ALLUPPERCASE1!', false, 'no lowercase'],
    ['NoNumbers!!', false, 'no number'],
    ['NoSpecial123', false, 'no special character'],
    ['ValidPass123!', true, 'meets every requirement'],
  ])('%s -> valid=%s (%s)', (password, expected) => {
    expect(strongPasswordSchema.safeParse(password).success).toBe(expected);
  });
});

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'ValidPass123!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a weak password even with valid name/email', () => {
    const result = registerSchema.safeParse({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'weak',
    });
    expect(result.success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('requires a valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'ada@example.com' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: '' }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({}).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts matching strong passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'ValidPass123!',
      confirmPassword: 'ValidPass123!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'ValidPass123!',
      confirmPassword: 'DifferentPass123!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['confirmPassword']);
    }
  });

  it('rejects a weak password even if confirmation matches', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'weak',
      confirmPassword: 'weak',
    });
    expect(result.success).toBe(false);
  });
});
