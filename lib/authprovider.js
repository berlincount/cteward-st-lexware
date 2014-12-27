var Promise    = require('bluebird');
var restify    = require('restify');
var database   = require('./database');
var memberdata = require('./memberdata');
var LdapAuth   = require('ldapauth-fork');

module.exports = {
    check_password: function check_password(password, hash) {
        // plaintext, wtf?
        if (hash.indexOf('$') !== 0)
            return password == hash;

        algoend = hash.indexOf('$',1);
        if (algoend <= 0)
            throw new Error("Password hashing algorithm not selected");
        algo = hash.substring(1,algoend);

        if (algo === 'apr1') {
            var md5 = require('apache-md5');
            return hash == md5(password, hash);
        }

        throw new Error("Unsupported password hashing algorithm used");
    },
    authorize: Promise.method(function authorize(v) {
        if (v.request.authorization.scheme === undefined && v.permissions._anonymous_ === undefined)
            throw new restify.errors.UnauthorizedError("Not authorized, anonymous access prohibited.");
        if (v.request.authorization.scheme !== 'Basic')
            throw new restify.errors.UnauthorizedError("Only Basic authentication is implemented right now.");


        return module.exports.find_botuser(v)
          .then(module.exports.find_ldapuser)
          .then(module.exports.find_config_flags)
          .then(module.exports.find_database_flags)
          .then(module.exports.impersonate)
          .then(module.exports.effective_permissions);
    }),
    find_botuser: Promise.method(function find_botuser(v) {
        if (v.username !== undefined)
            return v;

        // seek bot user
        var botpass = v.config.auth.bots[v.request.authorization.basic.username];

        // none found? pass along
        if (botpass === undefined)
            return v;

        try {
            passmatch = module.exports.check_password(v.request.authorization.basic.password, botpass);
        } catch (e) {
            throw new restify.errors.InternalError(e.message);
        }

        if (!passmatch)
            throw new restify.errors.UnauthorizedError("Not authorized. #2");

        v.username = v.request.authorization.basic.username;
        return v;
    }),
    find_ldapuser: Promise.method(function find_ldapuser(v) {
        if (v.username !== undefined)
            return v;

        if (v.config.ldap === undefined)
            throw new restify.errors.UnauthorizedError("Not authorized. #3");

        var ldap = new LdapAuth(v.config.ldap);
        ldap.authenticateAsync = Promise.promisify(ldap.authenticate);
        return ldap.authenticateAsync(
            v.request.authorization.basic.username,
            v.request.authorization.basic.password)
        .then(function() {
            v.username = v.request.authorization.basic.username;
            return v;
        }).catch(function(e){
            if (e.name === 'InvalidCredentialsError')
                return v;
            throw new restify.errors.InternalError("LDAP connection failed.");
        }).finally(function(){
            ldap.close(function() {});
        });
    }),
    find_config_flags: Promise.method(function find_config_flags(v) {
        if (v.username === undefined)
            throw new restify.errors.UnauthorizedError("Not authorized. #5");

        // basic flags
        v.flags = [ "_anonymous_" ];

        if (v.username == v.request.params.crewname)
            v.flags.push("_self_");

        if (v.config.auth.flags[v.username] !== undefined)
            v.flags = v.flags.concat(v.config.auth.flags[v.username]);

        v.request.log.debug('CFLAGS', v.flags);
        return v;
    }),
    find_database_flags: Promise.method(function find_database_flags(v) {
        if (v.username === undefined)
            throw new restify.errors.UnauthorizedError("Not authorized. #6");

        return database.memberlookup(v.username).then(function(data){
            v.request.log.debug('MEMBERLOOKUP', data);
            realstatus = memberdata.realstatus(data);
            v.request.log.debug('ROHSTATUS', data.Kennung3, 'REALSTATUS', realstatus);
            if (realstatus === 'crew')
                v.flags.push('_member_');
            else if (realstatus === 'raumfahrer')
                v.flags.push('_astronaut_');
            else if (realstatus === 'passiv')
                v.flags.push('_passive_');
            v.request.log.debug('DFLAGS', v.flags);
            return v;
        }).catch(function(){
            return v;
        });
    }),
    impersonate: Promise.method(function impersonate(v) {
        if (v.username === undefined)
            throw new restify.errors.UnauthorizedError("Not authorized. #7");

        if (v.request.query.impersonate === undefined)
            return v;

        if (v.request.query.impersonate === v.username)
            return v;

        if (v.flags.indexOf('_admin_') < 0 &&
            v.flags.indexOf('_board_') < 0)
            throw new restify.errors.UnauthorizedError("Not authorized. #8");

        v.request.log.debug('IMPERSONATE', v.request.query.impersonate);
        v.username = v.request.query.impersonate;
        v.flags    = [];
        return module.exports.find_config_flags(v)
         .then(module.exports.find_database_flags);
    }),
    effective_permissions: Promise.method(function effective_permissions(v) {
        if (v.username === undefined)
            throw new restify.errors.UnauthorizedError("Not authorized. #8");

        var level = 255;
        v.permission = v.permissions._anonymous_;

        for (var flag in v.permissions) {
            if (v.permissions[flag].level < level)
                if (v.flags.indexOf(flag) > -1) {
                    v.permission = v.permissions[flag];
                    level = v.permission.level;
                }
        }

        v.request.log.debug('PERMISSION', v.permission);

        if (v.permission === undefined)
            throw new restify.errors.ForbiddenError("The link you followed is either outdated, inaccurate, or the server has been instructed not to let you have it.");

        for (var key in v.permission)
            v[key] = v.permission[key];
        return v;
    })
};
