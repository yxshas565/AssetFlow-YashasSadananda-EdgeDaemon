from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://assetflow:assetflow_dev@localhost:5432/assetflow"
    JWT_SECRET: str = "change_this_in_prod_but_not_today"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8h shift, matches hackathon-day usage

    class Config:
        env_file = ".env"


settings = Settings()
