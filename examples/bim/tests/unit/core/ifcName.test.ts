import {
  decodeStepString,
  entityArguments,
  ifcBuildingName,
  usableName,
} from 'src/core';

/** Building_1911_AK_v2.ifc, as written. */
const PAEDAGOGISK = `DATA;
#1= IFCPROJECT('15LR9Aj8fA4eCrdnAwudiM',#18,'34372',$,$,'P\\X\\E6dagogisk Center','Udbudsprojekt',(#22),#306726);
#2= IFCBUILDING('15LR9Aj8fA4eCrdnAwudiN',#18,'P\\X\\E6dagosik Center',$,$,#30,$,'P\\X\\E6dagosik Center',.ELEMENT.,$,$,#31);`;

/** L187x_AK_v_done_v3b_processed.ifc, as written. */
const BYGNING_1870 = `DATA;
#1= IFCPROJECT('29fa62pe50pu2zreXLznet',#18,'39043-02',$,$,'Universitetsbyen - Bygning 1870','SOM UDF\\X2\\00D8\\X0\\RT',(#24),#1043004);
#2= IFCBUILDING('29fa62pe50pu2zreXLznes',#18,'',$,$,#32,$,'',.ELEMENT.,$,$,#33);`;

/** Building_1912_AK_v4.ifc, as written: the Revit template, never filled in. */
const TEMPLATE = `DATA;
#1= IFCPROJECT('0FHQg$qdvEPQB6VPH27kii',#18,'Project Number',$,$,'Project Name','Project Status',(#22),#167926);
#2= IFCBUILDING('0FHQg$qdvEPQB6VPH27kij',#18,'Building Name',$,$,#30,$,'Building Name',.ELEMENT.,$,$,#31);`;

/** substation_ok.ifc, as written: named on the project and nowhere else. */
const SUBSTATION = `DATA;
#1= IFCPROJECT('0b5j3C6_v5kA2vi1RMUzh5',$,'SWiM district cooling substation',$,$,$,$,(#10),#5);
#2= IFCBUILDING('2KVvvNoonF_RdJ2HL_fZM3',$,'DemoBuilding',$,$,#38,$,$,$,$,$,$);`;

test('an escaped ISO 8859-1 byte is the letter it stands for', () => {
  expect(decodeStepString('P\\X\\E6dagogisk')).toBe('Pædagogisk');
});

test('an escaped UTF-16 run is the letters it stands for', () => {
  expect(decodeStepString('SOM UDF\\X2\\00D8\\X0\\RT')).toBe('SOM UDFØRT');
});

test('a doubled quote and a doubled backslash are one of each', () => {
  expect(decodeStepString("O''Brien\\\\x")).toBe("O'Brien\\x");
});

test('an escaped upper-half character reads from ISO 8859-1', () => {
  // \S\ adds 128 to the character after it: \S\i is 0x69 + 0x80, 0xE9, é.
  expect(decodeStepString('caf\\S\\i')).toBe('café');
});

test('a code page switch carries no character of its own', () => {
  expect(decodeStepString('a\\PA\\b')).toBe('ab');
});

test('an escaped UTF-32 run is the characters it stands for', () => {
  expect(decodeStepString('\\X4\\0001F3E0\\X0\\')).toBe('🏠');
});

test('a backslash that starts no escape is kept as it is', () => {
  expect(decodeStepString('a\\qb')).toBe('a\\qb');
});

test('an escape that is never closed ends the string there', () => {
  expect(decodeStepString('ab\\X2\\00E6')).toBe('ab');
});

test('the arguments are split at the top level only', () => {
  const args = entityArguments(PAEDAGOGISK, 'IFCPROJECT');
  expect(args?.length).toBe(9);
  // The list stays one argument, and so does a string holding a comma.
  expect(args?.[7]).toBe('(#22)');
  expect(entityArguments("#1= IFCPROJECT('a, b',$);", 'IFCPROJECT')).toEqual([
    "'a, b'",
    '$',
  ]);
});

test('a doubled quote inside an argument stays inside it', () => {
  // O'Brien's Hall, as ISO 10303-21 writes it.
  const args = entityArguments(
    "#1= IFCPROJECT('O''Brien''s Hall',$);",
    'IFCPROJECT',
  );
  expect(args).toEqual(["'O''Brien''s Hall'", '$']);
  expect(
    ifcBuildingName("#1= IFCPROJECT('x',#2,'O''Brien''s Hall',$,$,$);"),
  ).toBe("O'Brien's Hall");
});

test('a statement cut off by the end of what was read gives nothing', () => {
  expect(
    entityArguments("#1= IFCPROJECT('a',#2,'unfinished", 'IFCPROJECT'),
  ).toBeNull();
});

test("the project's name wins over a misspelt one on the building", () => {
  expect(ifcBuildingName(PAEDAGOGISK)).toBe('Pædagogisk Center');
});

test('a job number is passed over for the name beside it', () => {
  expect(ifcBuildingName(BYGNING_1870)).toBe('Universitetsbyen - Bygning 1870');
});

test('a template nobody filled in names nothing', () => {
  // Seven of the twelve models in the shared library are this.
  expect(ifcBuildingName(TEMPLATE)).toBeNull();
});

test('the project name is read when it is the only name', () => {
  expect(ifcBuildingName(SUBSTATION)).toBe('SWiM district cooling substation');
});

test('a file with no project or building names nothing', () => {
  expect(ifcBuildingName('ISO-10303-21;\nHEADER;\nENDSEC;')).toBeNull();
});

test('template text, job numbers and empty values are not names', () => {
  for (const value of [
    'Project Name',
    'BUILDING NAME',
    'Default',
    '34372',
    '39043-02',
    '  ',
    null,
  ]) {
    expect(usableName(value)).toBeNull();
  }
  expect(usableName('  FEAS - Kommunehospital ')).toBe(
    'FEAS - Kommunehospital',
  );
});
