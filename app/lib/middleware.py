from fastapi import Header, Request


def get_tokens(request: Request, authorization: str = Header(None)) -> str:
    access_token = request.cookies.get("access_token", None)
    refresh_token = request.cookies.get("refresh_token", None)
    bearer_token = (
        authorization.removeprefix("Bearer ")
        if authorization and authorization.startswith("Bearer ")
        else None
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "bearer_token": bearer_token,
    }
