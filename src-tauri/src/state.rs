use std::sync::Mutex;

use crate::db::Database;

pub struct AppState {
  pub db: Mutex<Database>,
}

impl AppState {
  pub fn new(db: Database) -> Self {
    Self { db: Mutex::new(db) }
  }
}
