How it works:

Auto-Provisioning (init.sql): When you run docker-compose up, Docker looks at your init.sql file. If the database is empty, it automatically executes the code to create fashion_db and your tables. This completely removes the "manual import" step you were struggling with in phpMyAdmin.

Persistent Memory: Even if you delete your containers, your data survives in a Docker Volume called db_data. This maps the database's internal storage to a safe spot on your hard drive.

Environment Variables: Your PHP files (like login.php and get_items.php) use getenv() to find the database. Instead of hardcoding "localhost," they look for a host named db, which is the internal name Docker gives to your database container.


Why Docker?

You might be wondering why we went through all that trouble when XAMPP is just a "Start" button. Here is why the Docker method is the "Pro" move:

Environment Consistency: XAMPP relies on your computer's specific settings. Docker creates a tiny, identical "Virtual Computer". If it works for you, it will work for anyone else who clones your repo—no "Table not found" errors!

No Port Wars: Remember those errors where Docker and XAMPP fought over Port 80? Docker allows you to remap ports easily (e.g., using 8080:80) so you can run multiple projects at once without them clashing.


Deployment Ready: Your project includes a deployment.yaml file. This means your app is already configured for Kubernetes, the industry standard for hosting massive apps like TikTok or Netflix. XAMPP apps are very hard to move to the cloud; Docker apps are built for it.