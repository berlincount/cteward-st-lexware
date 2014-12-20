var csv = require('fast-csv');     // CSV generation
module.exports = {
    CSV_OUTPUT:  function renderer_csv_output(v) {
        v.response.charSet('utf-8');
        csv.writeToStream(v.response, v.data, {
            headers: true,
            delimiter: ';',
            rowDelimiter: '\n',
        });
        return v;
    },
    JSON_OUTPUT: function render_json_output(v) {
        v.response.charSet('utf-8');
        v.response.end(JSON.stringify(v.data, null, 2));
    }
};
