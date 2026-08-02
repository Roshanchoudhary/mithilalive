-- Insert default roles and permissions
INSERT INTO permissions (role, permissions) VALUES 
('super_admin', '["*"]'),
('admin', '["news.*", "users.read", "users.update", "categories.*", "tags.*", "settings.*", "ads.*"]'),
('editor', '["news.*", "categories.read", "tags.read"]'),
('reporter', '["news.create", "news.update", "news.read"]'),
('employee', '["news.create", "news.update_own", "news.read"]'),
('user', '["news.read", "comments.create"]');

-- Insert default settings
INSERT INTO settings (key, value, group_name) VALUES
('site_name', 'News Portal', 'general'),
('site_description', 'Your trusted source for news and updates', 'general'),
('site_logo', '/images/logo.png', 'appearance'),
('dark_logo', '/images/logo-dark.png', 'appearance'),
('favicon', '/favicon.ico', 'appearance'),
('primary_color', '#3b82f6', 'appearance'),
('secondary_color', '#1e293b', 'appearance'),
('header_layout', 'default', 'layout'),
('footer_layout', 'default', 'layout'),
('sidebar_position', 'right', 'layout');

-- Insert default menus
INSERT INTO menus (name, location, items, is_active) VALUES
('Header Menu', 'header', '[
  {"label": "Home", "href": "/"},
  {"label": "Politics", "href": "/category/politics"},
  {"label": "Technology", "href": "/category/technology"},
  {"label": "Business", "href": "/category/business"},
  {"label": "Sports", "href": "/category/sports"},
  {"label": "Entertainment", "href": "/category/entertainment"}
]', 1),
('Footer Menu', 'footer', '[
  {"label": "About", "href": "/about"},
  {"label": "Contact", "href": "/contact"},
  {"label": "Privacy Policy", "href": "/privacy"},
  {"label": "Terms of Service", "href": "/terms"},
  {"label": "Advertise", "href": "/advertise"},
  {"label": "Sitemap", "href": "/sitemap.xml"}
]', 1);

-- Insert sample categories
INSERT INTO categories (name, slug, description, is_active) VALUES
('Politics', 'politics', 'Latest political news and analysis', 1),
('Technology', 'technology', 'Technology news, reviews, and insights', 1),
('Business', 'business', 'Business news, markets, and economy', 1),
('Sports', 'sports', 'Sports news, scores, and highlights', 1),
('Entertainment', 'entertainment', 'Entertainment news, celebrity gossip, and more', 1),
('Health', 'health', 'Health news, wellness tips, and medical updates', 1),
('Science', 'science', 'Science news, discoveries, and research', 1),
('Education', 'education', 'Education news, trends, and resources', 1);
