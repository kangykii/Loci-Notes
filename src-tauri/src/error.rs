use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
  #[error("database error: {0}")]
  Database(#[from] rusqlite::Error),
  #[error("serialization error: {0}")]
  Serialization(#[from] serde_json::Error),
  #[error("io error: {0}")]
  Io(#[from] std::io::Error),
  #[error("{0}")]
  Message(String),
}

impl From<String> for AppError {
  fn from(value: String) -> Self {
    Self::Message(value)
  }
}

impl From<&str> for AppError {
  fn from(value: &str) -> Self {
    Self::Message(value.to_string())
  }
}

pub type AppResult<T> = Result<T, AppError>;

impl AppError {
  pub fn into_invoke_error(self) -> String {
    self.to_string()
  }
}

pub fn invoke_result<T>(result: AppResult<T>) -> Result<T, String> {
  result.map_err(|error| error.into_invoke_error())
}
