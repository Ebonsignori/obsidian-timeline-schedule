import moment from "moment";

// Parse user date string for start date
export function getStartDateFromUserString(
	dateString: string,
	settings: { startDateFormat: string; parseStartDateFormat: string }
) {
	let startDate = moment(dateString);
	if (settings.parseStartDateFormat && !startDate.isValid()) {
		startDate = moment(dateString, settings.parseStartDateFormat);
	}
	if (!startDate.isValid()) {
		startDate = moment(dateString, settings.startDateFormat);
	}
	return startDate;
}

// Regex
export const matchBlockRegex = /^(\[.*\]:)(.*)/gi;
export const matchHumanTimeRegex = /\(.*?\)(\s*?)$/gi;

// Match acceptable start date strings
// e.g. "Start:", "start", "[Start]:", etc
const acceptedStartWords = ["start", "begin"];
export function getAcceptableStartDateRegex(settings: {
	startBlockName: string;
}): RegExp {
	if (!acceptedStartWords.includes(settings.startBlockName.toLowerCase())) {
		acceptedStartWords.push(settings.startBlockName);
	}
	const regexString = acceptedStartWords.map((word) => `\\[?${word}\\]?:?`);
	return new RegExp(`(${regexString.join("|")})(.*)`, "gi");
}

// Only match "[end]:" blocks using user-specific end block name
export function getEndDateBlockRegex(settings: {
	endBlockName: string;
}): RegExp {
	return new RegExp(`(\\[${settings.endBlockName}\\]:)(.*)`, "i");
}
