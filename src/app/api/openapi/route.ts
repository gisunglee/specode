/**
 * GET /api/openapi
 * OpenAPI 3.0 스펙을 JSON으로 반환합니다.
 * Swagger UI 가 이 URL을 fetch 해서 렌더링합니다.
 */
import { openApiSpec } from "./spec";

export async function GET() {
  return Response.json(openApiSpec);
}
