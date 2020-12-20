# Gnome Extension: Glasa

This extension puts an icon in the panel consisting of two comic-like eyes following the cursor.
It is meant as a present and not to be confused with a fully robust Gnome extension.
Have fun with it.

![Screenshot](docs/images/screenshot.png)

## Author

- Markus Pawellek "lyrahgames" (markus.pawellek@mailbox.org)

## Usage

Clone the repository.

    git clone https://github.com/lyrahgames/gnome-extension-glasa.git

Change into the directory and run the makefile.

    cd gnome-extension-glasa
    make enable

Press `Alt+F2` and type `r` to restart the Gnome shell.
You should now be able to see the eyes icon appear in the panel.

To delete the extension, disable it and delete it.

    make disable
    make clean

