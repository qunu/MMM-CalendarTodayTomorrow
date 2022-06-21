/* MagicMirror²
 * Module: MMM-CalendarTodayTomorrow
 * By Qunu
 *
 * Based on the default Calendar module
 * By Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 */
Module.register("MMM-CalendarTodayTomorrow", {
	// Define module defaults
	defaults: {
		maximumEntries: 10, // Total Maximum Entries
		maximumNumberOfDays: 2,
		limitDays: 0, // Limit the number of days shown, 0 = no limit
		displaySymbol: true,
		defaultSymbol: "calendar-alt", // Fontawesome Symbol see https://fontawesome.com/cheatsheet?from=io
		showLocation: false,
		displayRepeatingCountTitle: false,
		defaultRepeatingCountTitle: "",
		maxTitleLength: 25,
		maxLocationTitleLength: 25,
		wrapEvents: false, // wrap events to multiple lines breaking at maxTitleLength
		wrapLocationEvents: false,
		maxTitleLines: 3,
		maxEventTitleLines: 3,
		fetchInterval: 5 * 60 * 1000, // Update every 5 minutes.
		animationSpeed: 2000,
		fade: true,
		urgency: 7,
		timeFormat: "relative",
		dateFormat: "MMM Do",
		dateEndFormat: "LT",
		fullDayEventDateFormat: "MMM Do",
		showEnd: false,
		getRelative: 6,
		fadePoint: 0.25, // Start on 1/4th of the list.
		hidePrivate: false,
		hideOngoing: false,
		hideTime: false,
		colored: false,
		coloredSymbolOnly: false,
		customEvents: [], // Array of {keyword: "", symbol: "", color: ""} where Keyword is a regexp and symbol/color are to be applied for matched
		tableClass: "small",
		calendars: [
			{
				symbol: "calendar-alt",
				url: "https://www.calendarlabs.com/templates/ical/US-Holidays.ics"
			}
		],
		titleReplace: {
			"De verjaardag van ": "",
			"'s birthday": ""
		},
		locationTitleReplace: {
			"street ": ""
		},
		broadcastEvents: true,
		excludedEvents: [],
		sliceMultiDayEvents: false,
		broadcastPastEvents: false,
		nextDaysRelative: false,
		selfSignedCert: false
	},

	requiresVersion: "2.1.0",

	// Define required scripts.
	getStyles: function () {
		return ["calendar.css", "font-awesome.css"];
	},

	// Define required scripts.
	getScripts: function () {
		return ["moment.js"];
	},

	// Define required translations.
	getTranslations: function () {
		// The translations for the default modules are defined in the core translation files.
		// Therefore we can just return false. Otherwise we should have returned a dictionary.
		// If you're trying to build your own module including translations, check out the documentation.
		return false;
	},

	// Override start method.
	start: function () {
		Log.info("Starting module: " + this.name);

		this.funnyholidaysToday = "No data",
        this.funnyholidaysTomorrow = "No data";

		// Set locale.
		moment.updateLocale(config.language, this.getLocaleSpecification(config.timeFormat));

		// clear data holder before start
		this.calendarData = {};

		// indicate no data available yet
		this.loaded = false;

		this.config.calendars.forEach((calendar) => {
			calendar.url = calendar.url.replace("webcal://", "http://");

			const calendarConfig = {
				maximumEntries: calendar.maximumEntries,
				maximumNumberOfDays: calendar.maximumNumberOfDays,
				broadcastPastEvents: calendar.broadcastPastEvents,
				selfSignedCert: calendar.selfSignedCert
			};

			if (calendar.symbolClass === "undefined" || calendar.symbolClass === null) {
				calendarConfig.symbolClass = "";
			}
			if (calendar.titleClass === "undefined" || calendar.titleClass === null) {
				calendarConfig.titleClass = "";
			}
			if (calendar.timeClass === "undefined" || calendar.timeClass === null) {
				calendarConfig.timeClass = "";
			}

			// we check user and password here for backwards compatibility with old configs
			if (calendar.user && calendar.pass) {
				Log.warn("Deprecation warning: Please update your calendar authentication configuration.");
				Log.warn("https://github.com/MichMich/MagicMirror/tree/v2.1.2/modules/default/calendar#calendar-authentication-options");
				calendar.auth = {
					user: calendar.user,
					pass: calendar.pass
				};
			}

			// tell helper to start a fetcher for this calendar
			// fetcher till cycle
			this.addCalendar(calendar.url, calendar.auth, calendarConfig);
		});
	},

	// Override socket notification handler.
	socketNotificationReceived: function (notification, payload) {
		if (this.identifier !== payload.id) {
			return;
		}

		if (notification === "CALENDAR_EVENTS") {
			if (this.hasCalendarURL(payload.url)) {
				this.calendarData[payload.url] = payload.events;
				this.error = null;
				this.loaded = true;

				if (this.config.broadcastEvents) {
					this.broadcastEvents();
				}
			}
		} else if (notification === "CALENDAR_ERROR") {
			let error_message = this.translate(payload.error_type);
			this.error = this.translate("MODULE_CONFIG_ERROR", { MODULE_NAME: this.name, ERROR: error_message });
			this.loaded = true;
		}

		this.updateDom(this.config.animationSpeed);
	},

	// Override dom generator.
	getDom: function () {

        const events = this.createEventList(true);

        var isFirst = false;
        var isFirstTomorrow = false;
        var text = "nodata";

	    events.forEach((event, index) => {
                    if (event.today) {
                        if (isFirst === false) {
                            this.funnyholidaysToday = "";
                            this.funnyholidaysToday = this.funnyholidaysToday + " " + event.title;
                            isFirst = true;
                        } else {
                            this.funnyholidaysToday = this.funnyholidaysToday + "," + event.title;
                        }
                    } else if (event.tomorrow) {
                        if (isFirstTomorrow === false) {
                            this.funnyholidaysTomorrow = "";
                            this.funnyholidaysTomorrow = this.funnyholidaysTomorrow + " " + event.title;
                            isFirstTomorrow = true;
                        } else {
                            this.funnyholidaysTomorrow = this.funnyholidaysTomorrow + "," + event.title;
                        }
                    }
                });

        var wrapper = document.createElement("div");

        var message = document.createElement("div");
        message.className = "small bright";

        var text = document.createElement("span");
        text.innerHTML = this.translate("TODAY") + ": " + this.funnyholidaysToday;

        message.appendChild(text);
        wrapper.appendChild(message);

        var subtext = document.createElement("div");
        subtext.innerHTML = this.translate("TOMORROW") + ": " + this.funnyholidaysTomorrow;
        subtext.className = "xsmall dimmed";
        wrapper.appendChild(subtext);

        return wrapper;
	},

	/**
	 * This function accepts a number (either 12 or 24) and returns a moment.js LocaleSpecification with the
	 * corresponding timeformat to be used in the calendar display. If no number is given (or otherwise invalid input)
	 * it will a localeSpecification object with the system locale time format.
	 *
	 * @param {number} timeFormat Specifies either 12 or 24 hour time format
	 * @returns {moment.LocaleSpecification} formatted time
	 */
	getLocaleSpecification: function (timeFormat) {
		switch (timeFormat) {
			case 12: {
				return { longDateFormat: { LT: "h:mm A" } };
			}
			case 24: {
				return { longDateFormat: { LT: "HH:mm" } };
			}
			default: {
				return { longDateFormat: { LT: moment.localeData().longDateFormat("LT") } };
			}
		}
	},

	/**
	 * Checks if this config contains the calendar url.
	 *
	 * @param {string} url The calendar url
	 * @returns {boolean} True if the calendar config contains the url, False otherwise
	 */
	hasCalendarURL: function (url) {
		for (const calendar of this.config.calendars) {
			if (calendar.url === url) {
				return true;
			}
		}

		return false;
	},

	/**
	 * Creates the sorted list of all events.
	 *
	 * @param {boolean} limitNumberOfEntries Whether to filter returned events for display.
	 * @returns {object[]} Array with events.
	 */
	createEventList: function (limitNumberOfEntries) {
		const now = new Date();
		const today = moment().startOf("day");
		const future = moment().startOf("day").add(this.config.maximumNumberOfDays, "days").toDate();
		let events = [];

		for (const calendarUrl in this.calendarData) {
			const calendar = this.calendarData[calendarUrl];
			for (const e in calendar) {
				const event = JSON.parse(JSON.stringify(calendar[e])); // clone object

				if (event.endDate < now && limitNumberOfEntries) {
					continue;
				}
				if (this.config.hidePrivate) {
					if (event.class === "PRIVATE") {
						// do not add the current event, skip it
						continue;
					}
				}
				if (this.config.hideOngoing && limitNumberOfEntries) {
					if (event.startDate < now) {
						continue;
					}
				}
				if (this.listContainsEvent(events, event)) {
					continue;
				}
				event.url = calendarUrl;
				event.today = event.startDate >= today && event.startDate < today + 24 * 60 * 60 * 1000;
				event.tomorrow = event.startDate >= today + 24 * 60 * 60 * 1000 && event.startDate < today + 48 * 60 * 60 * 1000;

				/* if sliceMultiDayEvents is set to true, multiday events (events exceeding at least one midnight) are sliced into days,
				 * otherwise, esp. in dateheaders mode it is not clear how long these events are.
				 */
				const maxCount = Math.ceil((event.endDate - 1 - moment(event.startDate, "x").endOf("day").format("x")) / (1000 * 60 * 60 * 24)) + 1;
				if (this.config.sliceMultiDayEvents && maxCount > 1) {
					const splitEvents = [];
					let midnight = moment(event.startDate, "x").clone().startOf("day").add(1, "day").format("x");
					let count = 1;
					while (event.endDate > midnight) {
						const thisEvent = JSON.parse(JSON.stringify(event)); // clone object
						thisEvent.today = thisEvent.startDate >= today && thisEvent.startDate < today + 24 * 60 * 60 * 1000;
						thisEvent.endDate = midnight;
						thisEvent.title += " (" + count + "/" + maxCount + ")";
						splitEvents.push(thisEvent);

						event.startDate = midnight;
						count += 1;
						midnight = moment(midnight, "x").add(1, "day").format("x"); // next day
					}
					// Last day
					event.title += " (" + count + "/" + maxCount + ")";
					splitEvents.push(event);

					for (let splitEvent of splitEvents) {
						if (splitEvent.endDate > now && splitEvent.endDate <= future) {
							events.push(splitEvent);
						}
					}
				} else {
					events.push(event);
				}
			}
		}

		events.sort(function (a, b) {
			return a.startDate - b.startDate;
		});

		if (!limitNumberOfEntries) {
			return events;
		}

		// Limit the number of days displayed
		// If limitDays is set > 0, limit display to that number of days
		if (this.config.limitDays > 0) {
			let newEvents = [];
			let lastDate = today.clone().subtract(1, "days").format("YYYYMMDD");
			let days = 0;
			for (const ev of events) {
				let eventDate = moment(ev.startDate, "x").format("YYYYMMDD");
				// if date of event is later than lastdate
				// check if we already are showing max unique days
				if (eventDate > lastDate) {
					// if the only entry in the first day is a full day event that day is not counted as unique
					if (newEvents.length === 1 && days === 1 && newEvents[0].fullDayEvent) {
						days--;
					}
					days++;
					if (days > this.config.limitDays) {
						continue;
					} else {
						lastDate = eventDate;
					}
				}
				newEvents.push(ev);
			}
			events = newEvents;
		}

		return events.slice(0, this.config.maximumEntries);
	},

	listContainsEvent: function (eventList, event) {
		for (const evt of eventList) {
			if (evt.title === event.title && parseInt(evt.startDate) === parseInt(event.startDate)) {
				return true;
			}
		}
		return false;
	},

	/**
	 * Requests node helper to add calendar url.
	 *
	 * @param {string} url The calendar url to add
	 * @param {object} auth The authentication method and credentials
	 * @param {object} calendarConfig The config of the specific calendar
	 */
	addCalendar: function (url, auth, calendarConfig) {
		this.sendSocketNotification("ADD_CALENDAR", {
			id: this.identifier,
			url: url,
			excludedEvents: calendarConfig.excludedEvents || this.config.excludedEvents,
			maximumEntries: calendarConfig.maximumEntries || this.config.maximumEntries,
			maximumNumberOfDays: calendarConfig.maximumNumberOfDays || this.config.maximumNumberOfDays,
			fetchInterval: this.config.fetchInterval,
			symbolClass: calendarConfig.symbolClass,
			titleClass: calendarConfig.titleClass,
			timeClass: calendarConfig.timeClass,
			auth: auth,
			broadcastPastEvents: calendarConfig.broadcastPastEvents || this.config.broadcastPastEvents,
			selfSignedCert: calendarConfig.selfSignedCert || this.config.selfSignedCert
		});
	},

	/**
	 * Retrieves the symbols for a specific event.
	 *
	 * @param {object} event Event to look for.
	 * @returns {string[]} The symbols
	 */
	symbolsForEvent: function (event) {
		let symbols = this.getCalendarPropertyAsArray(event.url, "symbol", this.config.defaultSymbol);

		if (event.recurringEvent === true && this.hasCalendarProperty(event.url, "recurringSymbol")) {
			symbols = this.mergeUnique(this.getCalendarPropertyAsArray(event.url, "recurringSymbol", this.config.defaultSymbol), symbols);
		}

		if (event.fullDayEvent === true && this.hasCalendarProperty(event.url, "fullDaySymbol")) {
			symbols = this.mergeUnique(this.getCalendarPropertyAsArray(event.url, "fullDaySymbol", this.config.defaultSymbol), symbols);
		}

		// If custom symbol is set, replace event symbol
		for (let ev of this.config.customEvents) {
			if (typeof ev.symbol !== "undefined" && ev.symbol !== "") {
				let needle = new RegExp(ev.keyword, "gi");
				if (needle.test(event.title)) {
					symbols[0] = ev.symbol;
					break;
				}
			}
		}

		return symbols;
	},

	mergeUnique: function (arr1, arr2) {
		return arr1.concat(
			arr2.filter(function (item) {
				return arr1.indexOf(item) === -1;
			})
		);
	},

	/**
	 * Retrieves the symbolClass for a specific calendar url.
	 *
	 * @param {string} url The calendar url
	 * @returns {string} The class to be used for the symbols of the calendar
	 */
	symbolClassForUrl: function (url) {
		return this.getCalendarProperty(url, "symbolClass", "");
	},

	/**
	 * Retrieves the titleClass for a specific calendar url.
	 *
	 * @param {string} url The calendar url
	 * @returns {string} The class to be used for the title of the calendar
	 */
	titleClassForUrl: function (url) {
		return this.getCalendarProperty(url, "titleClass", "");
	},

	/**
	 * Retrieves the timeClass for a specific calendar url.
	 *
	 * @param {string} url The calendar url
	 * @returns {string} The class to be used for the time of the calendar
	 */
	timeClassForUrl: function (url) {
		return this.getCalendarProperty(url, "timeClass", "");
	},

	/**
	 * Retrieves the calendar name for a specific calendar url.
	 *
	 * @param {string} url The calendar url
	 * @returns {string} The name of the calendar
	 */
	calendarNameForUrl: function (url) {
		return this.getCalendarProperty(url, "name", "");
	},

	/**
	 * Retrieves the color for a specific calendar url.
	 *
	 * @param {string} url The calendar url
	 * @returns {string} The color
	 */
	colorForUrl: function (url) {
		return this.getCalendarProperty(url, "color", "#fff");
	},

	/**
	 * Retrieves the count title for a specific calendar url.
	 *
	 * @param {string} url The calendar url
	 * @returns {string} The title
	 */
	countTitleForUrl: function (url) {
		return this.getCalendarProperty(url, "repeatingCountTitle", this.config.defaultRepeatingCountTitle);
	},

	/**
	 * Helper method to retrieve the property for a specific calendar url.
	 *
	 * @param {string} url The calendar url
	 * @param {string} property The property to look for
	 * @param {string} defaultValue The value if the property is not found
	 * @returns {*} The property
	 */
	getCalendarProperty: function (url, property, defaultValue) {
		for (const calendar of this.config.calendars) {
			if (calendar.url === url && calendar.hasOwnProperty(property)) {
				return calendar[property];
			}
		}

		return defaultValue;
	},

	getCalendarPropertyAsArray: function (url, property, defaultValue) {
		let p = this.getCalendarProperty(url, property, defaultValue);
		if (!(p instanceof Array)) p = [p];
		return p;
	},

	hasCalendarProperty: function (url, property) {
		return !!this.getCalendarProperty(url, property, undefined);
	},

	/**
	 * Shortens a string if it's longer than maxLength and add a ellipsis to the end
	 *
	 * @param {string} string Text string to shorten
	 * @param {number} maxLength The max length of the string
	 * @param {boolean} wrapEvents Wrap the text after the line has reached maxLength
	 * @param {number} maxTitleLines The max number of vertical lines before cutting event title
	 * @returns {string} The shortened string
	 */
	shorten: function (string, maxLength, wrapEvents, maxTitleLines) {
		if (typeof string !== "string") {
			return "";
		}

		if (wrapEvents === true) {
			const words = string.split(" ");
			let temp = "";
			let currentLine = "";
			let line = 0;

			for (let i = 0; i < words.length; i++) {
				const word = words[i];
				if (currentLine.length + word.length < (typeof maxLength === "number" ? maxLength : 25) - 1) {
					// max - 1 to account for a space
					currentLine += word + " ";
				} else {
					line++;
					if (line > maxTitleLines - 1) {
						if (i < words.length) {
							currentLine += "&hellip;";
						}
						break;
					}

					if (currentLine.length > 0) {
						temp += currentLine + "<br>" + word + " ";
					} else {
						temp += word + "<br>";
					}
					currentLine = "";
				}
			}

			return (temp + currentLine).trim();
		} else {
			if (maxLength && typeof maxLength === "number" && string.length > maxLength) {
				return string.trim().slice(0, maxLength) + "&hellip;";
			} else {
				return string.trim();
			}
		}
	},

	/**
	 * Capitalize the first letter of a string
	 *
	 * @param {string} string The string to capitalize
	 * @returns {string} The capitalized string
	 */
	capFirst: function (string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	},

	/**
	 * Transforms the title of an event for usage.
	 * Replaces parts of the text as defined in config.titleReplace.
	 * Shortens title based on config.maxTitleLength and config.wrapEvents
	 *
	 * @param {string} title The title to transform.
	 * @param {object} titleReplace Pairs of strings to be replaced in the title
	 * @param {boolean} wrapEvents Wrap the text after the line has reached maxLength
	 * @param {number} maxTitleLength The max length of the string
	 * @param {number} maxTitleLines The max number of vertical lines before cutting event title
	 * @returns {string} The transformed title.
	 */
	titleTransform: function (title, titleReplace, wrapEvents, maxTitleLength, maxTitleLines) {
		for (let needle in titleReplace) {
			const replacement = titleReplace[needle];

			const regParts = needle.match(/^\/(.+)\/([gim]*)$/);
			if (regParts) {
				// the parsed pattern is a regexp.
				needle = new RegExp(regParts[1], regParts[2]);
			}

			title = title.replace(needle, replacement);
		}

		title = this.shorten(title, maxTitleLength, wrapEvents, maxTitleLines);
		return title;
	},

	/**
	 * Broadcasts the events to all other modules for reuse.
	 * The all events available in one array, sorted on startdate.
	 */
	broadcastEvents: function () {
		const eventList = this.createEventList(false);
		for (const event of eventList) {
			event.symbol = this.symbolsForEvent(event);
			event.calendarName = this.calendarNameForUrl(event.url);
			event.color = this.colorForUrl(event.url);
			delete event.url;
		}

		this.sendNotification("CALENDAR_EVENTS", eventList);
	}
});
