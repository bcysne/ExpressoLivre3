<?php
/**
 * Tine 2.0
 * 
 * @package     Tasks
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @author      Cornelius Weiss <c.weiss@metaways.de>
 * @copyright   Copyright (c) 2007-2008 Metaways Infosystems GmbH (http://www.metaways.de)
 * @version     $Id$
 *
 * @todo        generalise that?
 */

/**
 * Tasks Filter Class
 * @package Tasks
 */
class Tasks_Model_TaskFilter extends Tinebase_Record_Abstract
{
    
    
    /**
     * key in $_validators/$_properties array for the filed which 
     * represents the identifier
     * 
     * @var string
     */    
    protected $_identifier = 'id';
    
    /**
     * application the record belongs to
     *
     * @var string
     */
    protected $_application = 'Tasks';
    
    protected $_validators = array(
        'id'                   => array('allowEmpty' => true,  'Int'   ),
        
        'containerType'        => array('allowEmpty' => true           ),
        'owner'                => array('allowEmpty' => true           ),
        'container'            => array('allowEmpty' => true           ),

        'query'                => array('allowEmpty' => true           ),
        'organizer'            => array('allowEmpty' => true           ),
        'status'               => array('allowEmpty' => true           ),
        'showClosed'           => array('allowEmpty' => true, 'InArray' => array(true,false)),
        'due'                  => array('allowEmpty' => true           ),
        'tag'                  => array('allowEmpty' => true           ),
        
    );
    
    /**
     * @var array hold selected operators
     */
    protected $_operators = array();
    
    /**
     * @var array holds additional options
     */
    protected $_options = array();
    
    /**
     * @var array maps abstract operators to sql operators
     */
    protected $_opSqlMap = array(
        'contains' => 'LIKE',
        'equals'   => 'LIKE',
        'greater'  => '>',
        'less'     => '<',
        'not'      => 'NOT LIKE'
    );
    
    /**
     * 
     */
    //public function __construct($_data = NULL, $_bypassFilters = false, $_convertDates = true)
    //{
        
    //}
    
    /**
     * sets the record related properties from user generated input.
     * 
     * Input-filtering and validation by Zend_Filter_Input can enabled and disabled
     *
     * @param array $_data the new data to set
     * @throws Tinebase_Exception_Record_Validation when content contains invalid or missing data
     */
    public function setFromArray(array $_data)
    {
        //Zend_Registry::get('logger')->debug(__METHOD__ . '::' . __LINE__ . " setting filters from array with data: " .
        //    print_r($_data, true));
        
        $data = array();
        foreach ($_data as $filter) {
            $field = (isset($filter['field']) && isset($filter['value'])) ? $filter['field'] : '';
            if (array_key_exists($field, $this->_validators)) {
                $data[$field] = $filter['value'];
                $this->_operators[$field] = $filter['operator'];
                $this->_options[$field] = array_diff_key($filter, array(
                    'field'    => NULL, 
                    'operator' => NULL,
                    'value'    => NULL
                ));
            }
        }
        
        if ($this->bypassFilters !== true) {
            // $this->validateOperators();
            // $this->validateOptions();
        }
        parent::setFromArray($data);
    }
    
    /**
     * appends current filters to a given select object
     * 
     * @param  Zend_Db_Select
     * @return void
     */
    public function appendFilterSql($_select)
    {
        $db = Zend_Registry::get('dbAdapter');
        
        foreach ($this->_properties as $field => $value)
        {
            //Zend_Registry::get('logger')->debug(__METHOD__ . '::' . __LINE__ . " append sql for filter '$field' width value '$value'");
            $value = str_replace(array('*', '_'), array('%', '\_'), $value);
            
            switch ($field) {
                case 'containerType':
                case 'container':
                case 'owner':
                    // skip container here handling for the moment
                    break;
                case 'query':
                    $queries = explode(' ', $value);
                    foreach ($queries as $query) {
                        $_select->where($db->quoteInto('(n_family LIKE ? OR n_given LIKE ? OR org_name LIKE ? or email LIKE ? or adr_one_locality LIKE ?)', '%' . trim($query) . '%'));
                    
                    }
                    break;
                case 'tag':
                    if (strlen($value) == 40) {
                        Tinebase_Tags::appendSqlFilter($_select, $value);
                    }
                    break;
                default:
                    $op = $this->_operators[$field];
                    $value = $op == 'contains' ? '%' . trim($value) . '%' : trim($value);
                    $where = array(
                        $db->quoteIdentifier($field),
                        $this->_opSqlMap[$op],
                        $db->quote($value)
                    );
                    $_select->where(implode(' ', $where));
                    break;
            }
        }
    }

    /**
     * gets record related properties
     * 
     * @param string name of property
     * @return mixed value of property
     */
    public function __get($_name)
    {
        switch ($_name) {
            case 'container':
                $this->_resolveContainer();
                break;
            default:
        }
        return parent::__get($_name);
    }
    
    /**
     * Resolves containers from selected nodes
     * 
     * @throws Tasks_Exception_UnexpectedValue
     * @return void
     */
    protected function _resolveContainer()
    {
        if (isset($this->_properties['container']) && is_array($this->_properties['container'])) {
            return;
        }
        if (!$this->containerType) {
            throw new Tasks_Exception_UnexpectedValue('You need to set a containerType.');
        }
        if ($this->containerType == 'Personal' && !$this->owner) {
            throw new Tasks_Exception_UnexpectedValue('You need to set an owner when containerType is "Personal".');
        }
        
        $cc = Tinebase_Container::getInstance();
        switch($this->containerType) {
            case 'all':
                $containers = $cc->getContainerByACL(Zend_Registry::get('currentAccount'), $this->_application, Tinebase_Model_Container::GRANT_READ);
                break;
            case 'personal':
                $containers = Zend_Registry::get('currentAccount')->getPersonalContainer($this->_application, $this->owner, Tinebase_Model_Container::GRANT_READ);
                break;
            case 'shared':
                $containers = Zend_Registry::get('currentAccount')->getSharedContainer($this->_application, Tinebase_Model_Container::GRANT_READ);
                break;
            case 'otherUsers':
                $containers = Zend_Registry::get('currentAccount')->getOtherUsersContainer($this->_application, Tinebase_Model_Container::GRANT_READ);
                break;
            case 'internal':
                $containers = array(Tinebase_Container::getInstance()->getInternalContainer(Zend_Registry::get('currentAccount'), 'Tasks'));
                break;    
            case 'singleContainer':
                $this->_properties['container'] = array($this->_properties['container']);
                return;
            default:
                throw new Tasks_Exception_UnexpectedValue('ContainerType not supported.');
        }
        $container = array();
        foreach ($containers as $singleContainer) {
            $container[] = $singleContainer->getId();
        }
        
        $this->_properties['container'] = $container;
    }    
}
