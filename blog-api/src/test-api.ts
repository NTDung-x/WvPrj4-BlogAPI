const BASE_URL = 'http://localhost:3000/api';

async function callApi(method: string, path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { status: res.status, data };
}

function check(step: string, actualStatus: number, expectedStatus: number, extraNote = '') {
  const ok = actualStatus === expectedStatus;
  console.log(`${ok ? 'Success' : 'Fail'} [${actualStatus}/${expectedStatus}] ${step} ${extraNote}`);
  if (!ok) process.exit(1);
}

async function runTests() {
  const suffix = Date.now();
  const emailA = `usera_${suffix}@gmail.com`;
  const emailB = `userb_${suffix}@gmail.com`;

  console.log('\n1: auth');
  const regA = await callApi('POST', '/auth/register', { name: 'User A', email: emailA, password: 'password123' });
  check('Đăng ký User A', regA.status, 201);
  const userIdA = regA.data.data.id;

  const regB = await callApi('POST', '/auth/register', { name: 'User B', email: emailB, password: 'password123' });
  check('Đăng ký User B', regB.status, 201);
  const userIdB = regB.data.data.id;

  const loginA = await callApi('POST', '/auth/login', { email: emailA, password: 'password123' });
  check('Đăng nhập User A', loginA.status, 200);
  const tokenA = loginA.data.data.accessToken;

  const loginB = await callApi('POST', '/auth/login', { email: emailB, password: 'password123' });
  const tokenB = loginB.data.data.accessToken;

  console.log('\n2: Categories & Tags');
  const cat = await callApi('POST', '/categories', { name: `Backend ${suffix}` }, tokenA);
  check('Tạo Category', cat.status, 201);
  const categoryId = cat.data.data.id;

  const tag = await callApi('POST', '/tags', { name: `TypeScript-${suffix}` }, tokenA);
  check('Tạo Tag', tag.status, 201);

  console.log('\n3: Posts');
  const post = await callApi(
    'POST',
    '/posts',
    {
      title: 'Blog API',
      content: 'Nội dung chi tiết...',
      published: true,
      categoryId,
      tags: ['NodeJS', 'prisma', 'ExpressJS', 'JWT'],
    },
    tokenA
  );
  check('Tạo Post kèm Tags', post.status, 201);
  const postId = post.data.data.id;

  const searchPost = await callApi('GET', '/posts?page=1&limit=5&search=Prisma&tag=nodejs');
  check('Tìm kiếm & lọc Post', searchPost.status, 200);

  const emptyUpdate = await callApi('PUT', `/posts/${postId}`, { title: '   ', content: '' }, tokenA);
  check('Sửa Post bỏ trống (giữ nguyên dữ liệu)', emptyUpdate.status, 200);

  const forbiddenUpdate = await callApi('PUT', `/posts/${postId}`, { title: 'Không có quyền sửa' }, tokenB);
  check('User B sửa bài User A bị chặn 403', forbiddenUpdate.status, 403);

  console.log('\n4: Comments');
  const blankComment = await callApi('POST', `/posts/${postId}/comments`, { content: '     ' }, tokenA);
  check('Bỏ qua comment toàn dấu cách', blankComment.status, 200, `(data = ${blankComment.data.data})`);

  const cmt = await callApi('POST', `/posts/${postId}/comments`, { content: 'Bài viết rất hay!' }, tokenA);
  check('Tạo comment hợp lệ', cmt.status, 201);
  const commentId = cmt.data.data.id;

  const delCmt = await callApi('DELETE', `/comments/${commentId}`, undefined, tokenA);
  check('Xóa comment', delCmt.status, 204);

  console.log('\n5: Users & Clear tests');
  const patchUser = await callApi('PATCH', `/users/${userIdA}`, { name: 'Nguyễn Trí Dũng' }, tokenA);
  check('Cập nhật tên User A', patchUser.status, 200);

  const delPost = await callApi('DELETE', `/posts/${postId}`, undefined, tokenA);
  check('Xóa Post', delPost.status, 204);

  const delUserA = await callApi('DELETE', `/users/${userIdA}`, undefined, tokenA);
  check('Xóa User A', delUserA.status, 204);

  const delUserB = await callApi('DELETE', `/users/${userIdB}`, undefined, tokenB);
  check('Xóa User B', delUserB.status, 204);

  console.log('\nAll tests passed!');
}

runTests();