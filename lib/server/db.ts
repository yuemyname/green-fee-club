import { Pool, types } from 'pg';

// bigserial(int8)을 문자열 대신 number로 받는다
types.setTypeParser(20, v => parseInt(v, 10));

declare global {
  // 개발 모드 핫리로드 시 풀이 중복 생성되지 않도록 전역에 보관
  var _grPool: Pool | undefined;
}

export function pool(): Pool {
  if (!global._grPool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL이 설정되지 않았습니다.');
    global._grPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  }
  return global._grPool;
}
