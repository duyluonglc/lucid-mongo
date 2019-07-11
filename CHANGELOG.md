## [3.1.6](https://github.com/duyluonglc/lucid-mongo/compare/3.1.5...3.1.6) (2019-07-11)


### Bug Fixes

* **package:** update pluralize to version 8.0.0 ([277f3a5](https://github.com/duyluonglc/lucid-mongo/commit/277f3a5))
* **updated_at:** lucid `Model._update` now set updated_at field properly. Fixes [#186](https://github.com/duyluonglc/lucid-mongo/issues/186) ([4582630](https://github.com/duyluonglc/lucid-mongo/commit/4582630))



## [3.1.5](https://github.com/duyluonglc/lucid-mongo/compare/v3.1.3...v3.1.5) (2018-11-15)


### Bug Fixes

* **belongsToMany:** fix attach and sync method ([87d8c2d](https://github.com/duyluonglc/lucid-mongo/commit/87d8c2d)), closes [#160](https://github.com/duyluonglc/lucid-mongo/issues/160)
* **connection:** fix issue with connection begin with mongo+srv:// ([ec334bb](https://github.com/duyluonglc/lucid-mongo/commit/ec334bb)), closes [#121](https://github.com/duyluonglc/lucid-mongo/issues/121)



<a name="3.1.4"></a>
## [3.1.4](https://github.com/duyluonglc/lucid-mongo/compare/v3.1.3...v3.1.4) (2018-11-10)


### Bug Fixes

* **objectId:** fix parse bjson object ([0f552be](https://github.com/duyluonglc/lucid-mongo/commit/0f552be)), closes [#158](https://github.com/duyluonglc/lucid-mongo/issues/158)



<a name="3.1.3"></a>
## [3.1.3](https://github.com/duyluonglc/lucid-mongo/compare/v3.1.2...v3.1.3) (2018-10-22)


### Bug Fixes

* **model:** merge dirty attributes after the hooks ([1d298a4](https://github.com/duyluonglc/lucid-mongo/commit/1d298a4))
* **package:** update dependencies ([98a6de6](https://github.com/duyluonglc/lucid-mongo/commit/98a6de6))
* **property:** use proper foreign key ([c16e624](https://github.com/duyluonglc/lucid-mongo/commit/c16e624))



<a name="3.1.2"></a>
## [3.1.2](https://github.com/duyluonglc/lucid-mongo/compare/3.1.1...3.1.2) (2018-09-24)



<a name="3.1.1"></a>
## [3.1.1](https://github.com/duyluonglc/lucid-mongo/compare/v3.1.0...v3.1.1) (2018-09-18)


### Bug Fixes

* **package:** update debug to version 4.0.0 ([8b866a5](https://github.com/duyluonglc/lucid-mongo/commit/8b866a5))
* **package:** update require-all to version 3.0.0 ([89b2b07](https://github.com/duyluonglc/lucid-mongo/commit/89b2b07))



<a name="3.1.0"></a>
# [3.1.0](https://github.com/duyluonglc/lucid-mongo/compare/v3.0.9...v3.1.0) (2018-06-27)


### Bug Fixes

* **Serializer:** remove id to string convertion on login ([cddf1d3](https://github.com/duyluonglc/lucid-mongo/commit/cddf1d3)), closes [#106](https://github.com/duyluonglc/lucid-mongo/issues/106)



<a name="3.0.9"></a>
## [3.0.9](https://github.com/duyluonglc/lucid-mongo/compare/v3.0.7...v3.0.9) (2018-06-11)


### Bug Fixes

* **connection:** fix connectionString with cluster ([2e54be0](https://github.com/duyluonglc/lucid-mongo/commit/2e54be0))



<a name="3.0.8"></a>
## [3.0.8](https://github.com/duyluonglc/lucid-mongo/compare/v3.0.7...v3.0.8) (2018-05-13)


### Bug Fixes

* **connection:** fix connectionString with cluster ([2e54be0](https://github.com/duyluonglc/lucid-mongo/commit/2e54be0))



<a name="3.0.7"></a>
## [3.0.7](https://github.com/duyluonglc/lucid-mongo/compare/v3.0.6...v3.0.7) (2018-05-02)



<a name="3.0.6"></a>
## [3.0.6](https://github.com/duyluonglc/lucid-mongo/compare/v3.0.5...v3.0.6) (2018-04-24)


### Bug Fixes

* **referMany:** fix can not detach ([f8ad672](https://github.com/duyluonglc/lucid-mongo/commit/f8ad672))



<a name="3.0.5"></a>
## [3.0.5](https://github.com/duyluonglc/lucid-mongo/compare/v3.0.4...v3.0.5) (2018-04-06)


### Bug Fixes

* **queryBuilder:** allow format field on query $and $or $nor ([c388dc0](https://github.com/duyluonglc/lucid-mongo/commit/c388dc0))



<a name="3.0.4"></a>
## [3.0.4](https://github.com/duyluonglc/lucid-mongo/compare/v3.0.3...v3.0.4) (2018-03-30)


### Bug Fixes

* **querybuilder:** fix querybuilder where of database ([647baff](https://github.com/duyluonglc/lucid-mongo/commit/647baff))



<a name="3.0.2"></a>
## [3.0.2](https://github.com/duyluonglc/lucid-mongo/compare/v3.0.1...v3.0.2) (2018-03-29)


### Bug Fixes

* **Date:** fix convert date ([6b96828](https://github.com/duyluonglc/lucid-mongo/commit/6b96828))


### Features

* **date:** use toISOString instead FORMAT_DATE ([f2f7fe3](https://github.com/duyluonglc/lucid-mongo/commit/f2f7fe3))



<a name="3.0.1"></a>
## [3.0.1](https://github.com/duyluonglc/lucid-mongo/compare/v3.0.0...v3.0.1) (2018-03-28)


### Bug Fixes
* **embeds:** execute hooks when save embeds ([d9a3b46](https://github.com/duyluonglc/lucid-mongo/commit/d9a3b46))

<a name="3.0.0"></a>
# [3.0.0](https://github.com/duyluonglc/lucid-mongo/compare/v2.2.3...v3.0.0) (2018-03-23)


### Bug Fixes

* **document:** fix objectIDs typo ([5dce705](https://github.com/duyluonglc/lucid-mongo/commit/5dce705))
* **embed:** format embed fields before save ([cfcaa44](https://github.com/duyluonglc/lucid-mongo/commit/cfcaa44))
* **EmbedsMany:** fix can not save with embedsMany relation ([d887b7c](https://github.com/duyluonglc/lucid-mongo/commit/d887b7c))
* **FieldType:** fix field type does not work ([a5294f7](https://github.com/duyluonglc/lucid-mongo/commit/a5294f7))
* **newUp:** fix newUp run parse twice ([a9d4f1f](https://github.com/duyluonglc/lucid-mongo/commit/a9d4f1f))
* **package:** update mquery to version 3.0.0 ([c609868](https://github.com/duyluonglc/lucid-mongo/commit/c609868))


### Features

* **FieldFormat:** parse array of ObjectID ([f7d2f58](https://github.com/duyluonglc/lucid-mongo/commit/f7d2f58))
* **queryBuilder:** change pattern condition of where method ([0448566](https://github.com/duyluonglc/lucid-mongo/commit/0448566))
* **relation:** add query method to relation ([c0c4b99](https://github.com/duyluonglc/lucid-mongo/commit/c0c4b99))



<a name="2.2.5"></a>
## [2.2.5](https://github.com/duyluonglc/lucid-mongo/compare/v2.2.3...v2.2.5) (2018-01-21)


### Bug Fixes

* **document:** fix objectIDs typo ([5dce705](https://github.com/duyluonglc/lucid-mongo/commit/5dce705))
* **EmbedsMany:** fix can not save with embedsMany relation ([d887b7c](https://github.com/duyluonglc/lucid-mongo/commit/d887b7c))
* **FieldType:** fix field type does not work ([a5294f7](https://github.com/duyluonglc/lucid-mongo/commit/a5294f7))
* **newUp:** fix newUp run parse twice ([a9d4f1f](https://github.com/duyluonglc/lucid-mongo/commit/a9d4f1f))
* **package:** update mquery to version 3.0.0 ([c609868](https://github.com/duyluonglc/lucid-mongo/commit/c609868))


### Features

* **relation:** add query method to relation ([c0c4b99](https://github.com/duyluonglc/lucid-mongo/commit/c0c4b99))



<a name="2.2.4"></a>
## [2.2.4](https://github.com/duyluonglc/lucid-mongo/compare/v2.2.3...v2.2.4) (2018-01-21)


### Bug Fixes

* **EmbedsMany:** fix can not save with embedsMany relation ([d887b7c](https://github.com/duyluonglc/lucid-mongo/commit/d887b7c))
* **FieldType:** fix field type does not work ([a5294f7](https://github.com/duyluonglc/lucid-mongo/commit/a5294f7))
* **package:** update mquery to version 3.0.0 ([c609868](https://github.com/duyluonglc/lucid-mongo/commit/c609868))


### Features

* **relation:** add query method to relation ([c0c4b99](https://github.com/duyluonglc/lucid-mongo/commit/c0c4b99))



<a name="2.2.3"></a>
## [2.2.3](https://github.com/duyluonglc/lucid-mongo/compare/v2.1.0...v2.2.3) (2018-01-10)


### Bug Fixes

* **belongsToMany:** pivotModel allow class and ioc container string ([d76e839](https://github.com/duyluonglc/lucid-mongo/commit/d76e839))
* **connection:** fix connection mongodb driver 3.0 ([fbd9e36](https://github.com/duyluonglc/lucid-mongo/commit/fbd9e36))
* **database:** use collections instead listCollections ([dfed4a0](https://github.com/duyluonglc/lucid-mongo/commit/dfed4a0))
* **Database:** database.close should remove connection ([992c1f7](https://github.com/duyluonglc/lucid-mongo/commit/992c1f7))
* **eagerloading:** fetch all nested relations ([46f0006](https://github.com/duyluonglc/lucid-mongo/commit/46f0006))
* **hooks:** hook afterPaginate ([f027712](https://github.com/duyluonglc/lucid-mongo/commit/f027712))
* **package:** fix break change mongodb 3.0.0 ([43e582a](https://github.com/duyluonglc/lucid-mongo/commit/43e582a))
* **package:** fix missing package ([c3a619c](https://github.com/duyluonglc/lucid-mongo/commit/c3a619c))
* **package:** fix package-lock ([516fabb](https://github.com/duyluonglc/lucid-mongo/commit/516fabb))
* **package:** update mongodb 3.0.0 ([8446f39](https://github.com/duyluonglc/lucid-mongo/commit/8446f39))
* **provider:** fix serializer register fails test ([737fa95](https://github.com/duyluonglc/lucid-mongo/commit/737fa95))
* **queryBuilder:** apply scopes for all query methods ([d197478](https://github.com/duyluonglc/lucid-mongo/commit/d197478))
* **serializer:** fix findById ([67e1480](https://github.com/duyluonglc/lucid-mongo/commit/67e1480))
* **serializer:** fix register serializer ([b2de724](https://github.com/duyluonglc/lucid-mongo/commit/b2de724))
* **serializer:** fix register serializer ([4ffb4f6](https://github.com/duyluonglc/lucid-mongo/commit/4ffb4f6))
* **serializer:** fix register serializer ([00d8326](https://github.com/duyluonglc/lucid-mongo/commit/00d8326))
* **serializer:** resolve serializer return string via ioc container ([d540ec1](https://github.com/duyluonglc/lucid-mongo/commit/d540ec1))
* **testing:** fix createCollection ([fa804a3](https://github.com/duyluonglc/lucid-mongo/commit/fa804a3))


### Features

* use Array.isArray of instanceof ([03d0bb5](https://github.com/duyluonglc/lucid-mongo/commit/03d0bb5))
* use Array.isArray of instanceof ([851071b](https://github.com/duyluonglc/lucid-mongo/commit/851071b))
* **connection:** Add options to mongodb connection string ([95684c4](https://github.com/duyluonglc/lucid-mongo/commit/95684c4))
* **lucid:** allow to unfreeze model instance ([0d86fd9](https://github.com/duyluonglc/lucid-mongo/commit/0d86fd9))
* **migrations:** introduce a silent flag to silent the output ([2aa044a](https://github.com/duyluonglc/lucid-mongo/commit/2aa044a))
* **package:** add semantic-release ([28096a4](https://github.com/duyluonglc/lucid-mongo/commit/28096a4))
* **queryBuilder:** add alias of whereNotIn ([ad3bd10](https://github.com/duyluonglc/lucid-mongo/commit/ad3bd10))
* **seed:** auto close db on when seeder finishes ([43be672](https://github.com/duyluonglc/lucid-mongo/commit/43be672))
* **serializer:** add serializer for authentication ([13e5603](https://github.com/duyluonglc/lucid-mongo/commit/13e5603))
* **serializer:** fix serializer ([16c39e7](https://github.com/duyluonglc/lucid-mongo/commit/16c39e7))



<a name="2.2.2"></a>
## [2.2.2](https://github.com/duyluonglc/lucid-mongo/compare/v2.1.0...v2.2.2) (2018-01-10)


### Bug Fixes

* **belongsToMany:** pivotModel allow class and ioc container string ([d76e839](https://github.com/duyluonglc/lucid-mongo/commit/d76e839))
* **connection:** fix connection mongodb driver 3.0 ([fbd9e36](https://github.com/duyluonglc/lucid-mongo/commit/fbd9e36))
* **database:** use collections instead listCollections ([dfed4a0](https://github.com/duyluonglc/lucid-mongo/commit/dfed4a0))
* **Database:** database.close should remove connection ([992c1f7](https://github.com/duyluonglc/lucid-mongo/commit/992c1f7))
* **hooks:** hook afterPaginate ([f027712](https://github.com/duyluonglc/lucid-mongo/commit/f027712))
* **package:** fix break change mongodb 3.0.0 ([43e582a](https://github.com/duyluonglc/lucid-mongo/commit/43e582a))
* **package:** fix missing package ([c3a619c](https://github.com/duyluonglc/lucid-mongo/commit/c3a619c))
* **package:** fix package-lock ([516fabb](https://github.com/duyluonglc/lucid-mongo/commit/516fabb))
* **package:** update mongodb 3.0.0 ([8446f39](https://github.com/duyluonglc/lucid-mongo/commit/8446f39))
* **provider:** fix serializer register fails test ([737fa95](https://github.com/duyluonglc/lucid-mongo/commit/737fa95))
* **queryBuilder:** apply scopes for all query methods ([d197478](https://github.com/duyluonglc/lucid-mongo/commit/d197478))
* **serializer:** fix findById ([67e1480](https://github.com/duyluonglc/lucid-mongo/commit/67e1480))
* **serializer:** fix register serializer ([00d8326](https://github.com/duyluonglc/lucid-mongo/commit/00d8326))
* **serializer:** fix register serializer ([b2de724](https://github.com/duyluonglc/lucid-mongo/commit/b2de724))
* **serializer:** fix register serializer ([4ffb4f6](https://github.com/duyluonglc/lucid-mongo/commit/4ffb4f6))
* **serializer:** resolve serializer return string via ioc container ([d540ec1](https://github.com/duyluonglc/lucid-mongo/commit/d540ec1))
* **testing:** fix createCollection ([fa804a3](https://github.com/duyluonglc/lucid-mongo/commit/fa804a3))


### Features

* use Array.isArray of instanceof ([851071b](https://github.com/duyluonglc/lucid-mongo/commit/851071b))
* **connection:** Add options to mongodb connection string ([95684c4](https://github.com/duyluonglc/lucid-mongo/commit/95684c4))
* **lucid:** allow to unfreeze model instance ([0d86fd9](https://github.com/duyluonglc/lucid-mongo/commit/0d86fd9))
* **package:** add semantic-release ([28096a4](https://github.com/duyluonglc/lucid-mongo/commit/28096a4))
* **queryBuilder:** add alias of whereNotIn ([ad3bd10](https://github.com/duyluonglc/lucid-mongo/commit/ad3bd10))
* **seed:** auto close db on when seeder finishes ([43be672](https://github.com/duyluonglc/lucid-mongo/commit/43be672))
* **serializer:** add serializer for authentication ([13e5603](https://github.com/duyluonglc/lucid-mongo/commit/13e5603))
* **serializer:** fix serializer ([16c39e7](https://github.com/duyluonglc/lucid-mongo/commit/16c39e7))


## v2.0.0 ( Mon Aug 28 2017 02:43:47 GMT+0700 (SE Asia Standard Time) )


## Bug Fixes
  - fix has many through
  ([199edb9d](https://github.com/duyluonglc/lucid-mongo/commit/199edb9dfd211a83c1edb8f0109a6bdcc5de66ed))
  - fix appveyor config
  ([b60d18ab](https://github.com/duyluonglc/lucid-mongo/commit/b60d18ab34f99635224eae46037685510c24342c))
  - fix test env
  ([2f16a784](https://github.com/duyluonglc/lucid-mongo/commit/2f16a78415683171903eeef13dc6df727e8f3359))
  - fix bug make collection name
  ([d1484192](https://github.com/duyluonglc/lucid-mongo/commit/d1484192d128ad75ffed250284d115358eb441ab))
  - fix factory
  ([8bb06002](https://github.com/duyluonglc/lucid-mongo/commit/8bb060020d4e8ee83e0e104145ac06b227d477d4))
  - fix schema & lucid spec
  ([f8e0e66c](https://github.com/duyluonglc/lucid-mongo/commit/f8e0e66cd329839753c532025240c679907c92f2))
  - fix run test
  ([b0e3f40c](https://github.com/duyluonglc/lucid-mongo/commit/b0e3f40ce06f6ed35505949ed70fc9e209d64562))
  - fix pagination
  ([091c2a56](https://github.com/duyluonglc/lucid-mongo/commit/091c2a562527cfbe3ff290d3c1cfd94240c7d423))

  - **package**
    - update pluralize to version 7.0.0
  ([12c837b8](https://github.com/duyluonglc/lucid-mongo/commit/12c837b8f8dfb6f34e2db6721187589a1a1be9a0))




## Test
  - test belongs to many
  ([1eb9f8b2](https://github.com/duyluonglc/lucid-mongo/commit/1eb9f8b2a5a0240a1817e16aa7930e40b8d718d2))
  - test belongs to
  ([91cd043e](https://github.com/duyluonglc/lucid-mongo/commit/91cd043e31c8ec7cc2e25d246b94fc3f2db9636e))
  - test belongs to
  ([0fa590e5](https://github.com/duyluonglc/lucid-mongo/commit/0fa590e595e8819f5d7ebb36e5cf30d9f2e4dfd2))
  - test has many
  ([99d5f043](https://github.com/duyluonglc/lucid-mongo/commit/99d5f043a0723837a06c3698e27ea9a709454fe5))
  - test lucid relation
  ([ef426f49](https://github.com/duyluonglc/lucid-mongo/commit/ef426f499bacc643bb30a845055960359bc7c2a3))
  - test migration
  ([fd8bc7bb](https://github.com/duyluonglc/lucid-mongo/commit/fd8bc7bb61791909c243de18084e931c8ddf3008))
  - test factory
  ([90f2f510](https://github.com/duyluonglc/lucid-mongo/commit/90f2f510444f53f323abf9471c87eeb3ac48c495))
  - test database
  ([831cbffe](https://github.com/duyluonglc/lucid-mongo/commit/831cbffe5d6f22ece5094741d564d77167bcd36e))
  - test lucid serializer
  ([51efb184](https://github.com/duyluonglc/lucid-mongo/commit/51efb1841566127341ace74d3c5cf51b2c4b3093))





---
<sub><sup>*Generated with [git-changelog](https://github.com/rafinskipg/git-changelog). If you have any problems or suggestions, create an issue.* :) **Thanks** </sub></sup>
