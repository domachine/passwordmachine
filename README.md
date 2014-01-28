
# passwordmachine

  Organize your passwords in a database encrypted with a master
  password.

## Installation

   $ npm install -g passwordmachine

## Usage

  ```
  Usage: passwordmachine [options] <pattern>

  Options:
    -v, --value    Set a password.                   
    -f, --file     Path to database file.              [default: "/home/domachine/.passwordmachine"]
    -e, --encrypt  Encrypt a file.                    
    -V, --verbose  Verbose output.                    
    -d, --dump     Dump the database.                
    -c, --create   Create a new database.            
    -r, --remove   Remove an entry from the database.
  ```

### Create a database

  At first use you have to create your database.  The default output
  file is `~/.passwordmachine`.  You can change the file
  `passwordmachine` works on using the `-f` parameter.

    $ passwordmachine -c
    Password:

### Show contents

  List the full content of your database with the following command.

    $ passwordmachine /
    Password:

    total 2
    d google.de/
    p google.de/user
    p google.de/password
    d mywebsite/app1/
    p mywebsite/app1/password
    d mywebsite/app2/
    p mywebsite/app2/password

  Show a specific directory or a password

    $ passwordmachine mywebsite
    Password:

    total 2
    d app1/
    d app2/

    $ passwordmachine mywebsite/app2/password
    Password:
    my_secret_password

### Search

  To search through your password database use the following.  Notice
  the slash at the start of the argument which triggers a search.  The
  part after the slash is a regular expression.

     $ passwordmachine '/^app'
     Password:

     total 2
     d mywebsite/app1/
     d mywebsite/app2/

### Create or change a password

  To create a new password use this.  Directories are created on the
  fly.

    $ passwordmachine 'mywebsite/app3/password' -v 'my_app3_secret_password'
    Password:

  Updating is exactly the same.

    $ passwordmachine 'mywebsite/app3/password' -v 'my_changed_secret_password'
    Password:

### Remove a password/directory

  Removing is as easy as this.

    $ passwordmachine -r mywebsite/app3

  This works with passwords and directories.
