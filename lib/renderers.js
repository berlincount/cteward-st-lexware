var csv = require('fast-csv');     // CSV generation
module.exports = {
    CSV_OUTPUT:  function renderer_csv_output(v) {
        v.response.setHeader('Content-Type', 'text/csv; charset=utf-8');
        csv.writeToStream(v.response, v.data, {
            headers: true,
            delimiter: ';',
            rowDelimiter: '\n',
        });
        return v;
    },
    JSON_OUTPUT: function render_json_output(v) {
        v.response.setHeader('Content-Type', 'application/json; charset=utf-8');
        v.response.end(JSON.stringify(v.data, function(key, val) {
                return (val && val.toFixed) ? Number(val.toFixed(2)) : val;
        }, 2));
    }
};
