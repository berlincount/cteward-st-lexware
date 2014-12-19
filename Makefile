REPORTER = spec
test: lint
	@TZ=UTC NODE_ENV=test ./node_modules/.bin/mocha -b --reporter $(REPORTER)

lint:
	./node_modules/.bin/jshint ./lib ./test ./app.js

test-cov: test
	@TZ=UTC NODE_ENV=test ./node_modules/.bin/mocha \
		--require blanket \
		--reporter html-cov > coverage.html.new \
	&& cat coverage.html.new > coverage.html \
	&& rm coverage.html.new
	@# avoiding an empty (hardlinked) coverage file between runs

test-cov-coveralls: test
	@echo TRAVIS_JOB_ID $(TRAVIS_JOB_ID)
	@TZ=UTC NODE_ENV=test ./node_modules/.bin/mocha \
		--require blanket \
		--reporter mocha-lcov-reporter | ./node_modules/coveralls/bin/coveralls.js

test-cov-travis: test-cov-coveralls
	@echo TRAVIS_JOB_ID $(TRAVIS_JOB_ID)
	@TZ=UTC NODE_ENV=test ./node_modules/.bin/mocha \
		--require blanket \
		--reporter travis-cov

.PHONY: test
