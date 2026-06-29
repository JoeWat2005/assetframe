 
// Soft-unpublish flag for editions: hidden editions disappear from the public catalogue,
// sitemap, and reader (404), but stay in the DB so an admin can restore them. The report
// files remain in R2 untouched.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`alter table editions add column if not exists hidden boolean not null default false;`);
};

exports.down = (pgm) => {
  pgm.sql(`alter table editions drop column if exists hidden;`);
};
