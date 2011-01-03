<?php
/**
 * Tine 2.0 - http://www.tine20.org
 * 
 * @package     Calendar
 * @license     http://www.gnu.org/licenses/agpl.html
 * @copyright   Copyright (c) 2010 Metaways Infosystems GmbH (http://www.metaways.de)
 * @author      Cornelius Weiss <c.weiss@metaways.de>
 * @version     $Id$
 * 
 */

/**
 * Test helper
 */
require_once dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . 'TestHelper.php';

/**
 * Test class for Calendar_ICalTests
 */
class Calendar_Export_ICalTest extends PHPUnit_Framework_TestCase //extends Calendar_TestCase
{
    public function setUp()
    {
        $this->_testEvent = new Calendar_Model_Event(array(
            'dtstart'       => '2010-12-30 12:00:00',
            'dtend'         => '2010-12-30 13:00:00',
            'originator_tz' => 'Europe/Berlin',
            'summary'       => 'take a nap',
            'description'   => 'hard working man needs some silence',
            'uid'           => Tinebase_Record_Abstract::generateUID(),
            'seq'           => 3,
            'transp'        => Calendar_Model_Event::TRANSP_OPAQUE,
            'class'         => Calendar_Model_Event::CLASS_PUBLIC,
            'location'      => 'couch',
            'priority'      => 1,
            'rrule'         => 'FREQ=DAILY;INTERVAL=1;UNTIL=2015-12-30 13:00:00'
        ));
    }
    
    public function testExport()
    {
        $exporter = new Calendar_Export_Ical();
        $ics = $exporter->eventToIcal($this->_testEvent);
//        echo $ics;

        // assert basics
        $this->assertEquals(1, preg_match("/SUMMARY:{$this->_testEvent->summary}\r\n/", $ics), 'SUMMARY not correct');
        
        // assert dtstart/dtend tz
        $this->assertEquals(1, preg_match("/DTSTART;TZID=Europe\/Berlin:20101230T130000\r\n/", $ics), 'DTSTART not correct');
        $this->assertEquals(1, preg_match("/DTEND;TZID=Europe\/Berlin:20101230T140000\r\n/", $ics), 'DTEND not correct');
        
        // assert vtimezone
        $this->assertEquals(1, preg_match("/BEGIN:VTIMEZONE\r\n/", $ics), 'VTIMEZONE missing');
        $this->assertEquals(1, preg_match("/BEGIN:DAYLIGHT\r\nTZOFFSETFROM:\+0100\r\nTZOFFSETTO:\+0200\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\nEND:DAYLIGHT\r\n/", $ics), 'DAYLIGHT not correct');

        // assert rrule
        $this->assertEquals(1, preg_match("/RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=20151230T130000Z\r\n/", $ics), 'RRULE broken');
    }
    
    public function testExportRecurId()
    {
        $exceptions = new Tinebase_Record_RecordSet('Calendar_Model_Event');
        $nextOccurance = Calendar_Model_Rrule::computeNextOccurrence($this->_testEvent, $exceptions, $this->_testEvent->dtstart);
        
        $exporter = new Calendar_Export_Ical();
        $ics = $exporter->eventToIcal($nextOccurance);
//        echo $ics;

        // assert recurid
        $this->assertEquals(1, preg_match("/RECURRENCE-ID;TZID=Europe\/Berlin:20101231T130000\r\n/", $ics), 'RECURRENCE-ID broken');
    }
    
    public function testExportExdate()
    {
        $exceptions = new Tinebase_Record_RecordSet('Calendar_Model_Event');
        $from = clone $this->_testEvent->dtstart;
        $until = clone $this->_testEvent->dtend;
        $until->addDay(2);
        
        $recurSet = Calendar_Model_Rrule::computeRecuranceSet($this->_testEvent, $exceptions, $from, $until);
        $this->_testEvent->exdate = $recurSet->dtstart;

        $exporter = new Calendar_Export_Ical();
        $ics = $exporter->eventToIcal($this->_testEvent);
//        echo $ics;

        // assert exdate
        $this->assertEquals(1, preg_match("/EXDATE;TZID=Europe\/Berlin:20101231T130000,20110101T130000\r\n/", $ics), 'RECURRENCE-ID broken');
    }
    
    public function testExportRecurSet()
    {
        $exceptions = new Tinebase_Record_RecordSet('Calendar_Model_Event');
        $from = clone $this->_testEvent->dtstart;
        $until = clone $this->_testEvent->dtend;
        $until->addDay(2);
        
        $recurSet = Calendar_Model_Rrule::computeRecuranceSet($this->_testEvent, $exceptions, $from, $until);
        $this->_testEvent->exdate = array($recurSet->dtstart[0]);
        
        $eventSet = new Tinebase_Record_RecordSet('Calendar_Model_Event', array(
            $this->_testEvent,
            $recurSet[1]
        ));

        $exporter = new Calendar_Export_Ical();
        $ics = $exporter->eventToIcal($eventSet);
//        echo $ics;

        $this->assertEquals(2, preg_match_all('/BEGIN:VEVENT\r\n/', $ics, $matches), 'There should be exactly 2 VEVENT compontents');
    }
}