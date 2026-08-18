export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store",
  "Content-Type": "application/json; charset=utf-8"
};

export function apiSuccess<T>(data: T, init: ResponseInit = {}) {
  return Response.json(
    { success: true, data },
    {
      ...init,
      headers: { ...privateNoStoreHeaders, ...init.headers }
    }
  );
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  init: Omit<ResponseInit, "status"> = {}
) {
  return Response.json(
    { success: false, error: { code, message } },
    {
      ...init,
      status,
      headers: { ...privateNoStoreHeaders, ...init.headers }
    }
  );
}
