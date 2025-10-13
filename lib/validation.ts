export function validateDisplayName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: '닉네임을 입력해주세요.' };
  }
  if (name.length < 2) {
    return { valid: false, error: '닉네임은 최소 2자 이상이어야 합니다.' };
  }
  if (name.length > 50) {
    return { valid: false, error: '닉네임은 50자 미만이어야 합니다.' };
  }
  return { valid: true };
}

export function validateBio(bio: string): { valid: boolean; error?: string } {
  if (bio.length > 200) {
    return { valid: false, error: '소개는 200자 이하여야 합니다.' };
  }
  return { valid: true };
}

export function validateMessage(text: string): {
  valid: boolean;
  error?: string;
} {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: '메시지를 입력해주세요.' };
  }
  if (text.length > 2000) {
    return { valid: false, error: '메시지가 너무 깁니다.' };
  }
  return { valid: true };
}

export function validateProposalTime(date: Date): {
  valid: boolean;
  error?: string;
} {
  const now = new Date();
  if (date <= now) {
    return { valid: false, error: '식사 시간은 미래로 설정해야 합니다.' };
  }
  return { valid: true };
}
