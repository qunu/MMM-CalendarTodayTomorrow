# Module: MMM-CalendarTodayTomorrow

This calendar module functions the same as the default calendar app, but it only displays Today and Tomorrows events.

This module displays events from a public .ical calendar. It can combine multiple calendars.

## Screenshot

![Screenshot](screenshot.png)

## Installation

1. Navigate to the `MagicMirror/modules` directory.
2. Execute `git clone https://github.com/qunu/MMM-CalendarTodayTomorrow.git`
3. Configure the module as per below
4. Restart MagicMirror

For configuration options, please check the [MagicMirror² documentation](https://docs.magicmirror.builders/modules/calendar.html).

**NOTE: The default for config `maximumNumberOfDays` has been set to 2**



Get Emojis (No colour)

For anyone that has the same issue I was able to fix it by doing the following steps:

Follow this article’s step to download and create font-config
https://www.omgubuntu.co.uk/2016/08/enable-color-emoji-linux-google-chrome-noto

Unzip folder from Raspberry Pi’s Download Folder

Open Terminal and type the following:
cp *.ttf ~/.fonts/
fc-cache -v -f

Reboot Raspberry Pi

Verify that you can see emoji


You can undo the changes by deleting the fontconfig, deleting the Noto Color Emoji font, and flushing the font cache (basically reversing the entire process).

Apps that I’ve noticed don’t play nice when this has been applied include Geary (message body is all garbled), Thunderbird, Geany and some pages in Firefox display incorrectly.

These were the articles that helped me the most

https://www.omgubuntu.co.uk/2016/08/enable-color-emoji-linux-google-chrome-noto

https://raspberrytips.com/install-fonts-raspberry-pi/
